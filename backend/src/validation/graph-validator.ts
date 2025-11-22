/**
 * Graph Validator
 *
 * Validates the graph structure of a strategy, including:
 * - Hot Potato rules (critical for flash loans)
 * - Type safety rules
 * - DAG structure
 * - PTB limits
 */

import {
  Strategy,
  ValidationResult,
  ValidationRule,
  Node,
  Edge,
  FlashBorrowNode,
  FlashRepayNode,
} from "../types/strategy";

export class GraphValidator {
  /**
   * Validate the entire strategy graph
   */
  static validate(strategy: Strategy): ValidationResult {
    const errors: ValidationRule[] = [];
    const warnings: ValidationRule[] = [];
    const info: ValidationRule[] = [];

    // Run all validation rules
    this.validateHotPotato(strategy, errors);
    this.validateTypeSafety(strategy, errors, warnings);
    this.validateDAG(strategy, errors);
    this.validatePTBLimits(strategy, errors, warnings);
    this.validateReferences(strategy, errors);

    return {
      success: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  // ==========================================================================
  // HOT POTATO VALIDATION (CRITICAL)
  // ==========================================================================

  /**
   * HOT_POTATO_1: Every FLASH_BORROW must have a corresponding FLASH_REPAY
   */
  private static validateHotPotato(strategy: Strategy, errors: ValidationRule[]): void {
    const borrowNodes = strategy.nodes.filter(
      (n) => n.type === "FLASH_BORROW"
    ) as FlashBorrowNode[];
    const repayNodes = strategy.nodes.filter(
      (n) => n.type === "FLASH_REPAY"
    ) as FlashRepayNode[];

    for (const borrow of borrowNodes) {
      // Find receipt output
      const receiptOutput = borrow.outputs.find((o) => o.output_type === "RECEIPT");
      if (!receiptOutput) {
        errors.push({
          rule_id: "HOT_POTATO_NO_RECEIPT",
          severity: "ERROR",
          message: `FLASH_BORROW node "${borrow.id}" does not have a receipt output`,
          node_id: borrow.id,
        });
        continue;
      }

      // Find edge connecting receipt to repay
      const receiptEdge = strategy.edges.find(
        (e) =>
          e.source === borrow.id &&
          e.source_output === receiptOutput.id &&
          e.edge_type === "RECEIPT"
      );

      if (!receiptEdge) {
        errors.push({
          rule_id: "HOT_POTATO_1",
          severity: "ERROR",
          message: `FLASH_BORROW node "${borrow.id}" has no receipt connection to FLASH_REPAY`,
          node_id: borrow.id,
        });
        continue;
      }

      // Check that target is a FLASH_REPAY node
      const repayNode = strategy.nodes.find((n) => n.id === receiptEdge.target);
      if (!repayNode || repayNode.type !== "FLASH_REPAY") {
        errors.push({
          rule_id: "HOT_POTATO_2",
          severity: "ERROR",
          message: `Receipt from FLASH_BORROW "${borrow.id}" must connect directly to FLASH_REPAY (found: ${repayNode?.type || "nothing"})`,
          node_id: borrow.id,
          edge_id: receiptEdge.id,
        });
        continue;
      }

      const repay = repayNode as FlashRepayNode;

      // HOT_POTATO_3: Protocol must match
      if (borrow.protocol !== repay.protocol) {
        errors.push({
          rule_id: "HOT_POTATO_3",
          severity: "ERROR",
          message: `FLASH_BORROW and FLASH_REPAY must use same protocol (borrow: ${borrow.protocol}, repay: ${repay.protocol})`,
          node_id: borrow.id,
        });
      }

      // ASSET_1: Asset must match
      if (borrow.params.asset !== repay.params.asset) {
        errors.push({
          rule_id: "ASSET_1",
          severity: "ERROR",
          message: `FLASH_BORROW and FLASH_REPAY asset mismatch (borrow: ${borrow.params.asset}, repay: ${repay.params.asset})`,
          node_id: borrow.id,
        });
      }
    }

    // Check that all repay nodes have a corresponding borrow
    for (const repay of repayNodes) {
      const receiptEdge = strategy.edges.find(
        (e) => e.target === repay.id && e.edge_type === "RECEIPT"
      );

      if (!receiptEdge) {
        errors.push({
          rule_id: "HOT_POTATO_ORPHAN_REPAY",
          severity: "ERROR",
          message: `FLASH_REPAY node "${repay.id}" has no receipt input`,
          node_id: repay.id,
        });
      }
    }
  }

  // ==========================================================================
  // TYPE SAFETY VALIDATION
  // ==========================================================================

  /**
   * Validate that coin types match across edges
   */
  private static validateTypeSafety(
    strategy: Strategy,
    errors: ValidationRule[],
    warnings: ValidationRule[]
  ): void {
    const coinEdges = strategy.edges.filter((e) => e.edge_type === "COIN");

    for (const edge of coinEdges) {
      const sourceNode = strategy.nodes.find((n) => n.id === edge.source);
      const targetNode = strategy.nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        errors.push({
          rule_id: "TYPE_SAFETY_NODE_NOT_FOUND",
          severity: "ERROR",
          message: `Edge "${edge.id}" references non-existent nodes`,
          edge_id: edge.id,
        });
        continue;
      }

      // Validate that coin_type is specified for COIN edges
      if (!edge.coin_type) {
        warnings.push({
          rule_id: "TYPE_SAFETY_MISSING_COIN_TYPE",
          severity: "WARNING",
          message: `COIN edge "${edge.id}" should specify coin_type for better validation`,
          edge_id: edge.id,
        });
      }
    }

    // TYPE_SAFETY_2: COIN_MERGE validation
    const mergeNodes = strategy.nodes.filter((n) => n.type === "COIN_MERGE");

    for (const node of mergeNodes) {
      const incomingEdges = strategy.edges.filter(
        (e) => e.target === node.id && e.edge_type === "COIN"
      );

      const coinTypes = new Set(incomingEdges.map((e) => e.coin_type).filter((t) => t !== undefined));

      if (coinTypes.size > 1) {
        errors.push({
          rule_id: "TYPE_SAFETY_2",
          severity: "ERROR",
          message: `COIN_MERGE node "${node.id}" cannot merge coins of different types: ${Array.from(coinTypes).join(", ")}`,
          node_id: node.id,
        });
      }
    }
  }

  // ==========================================================================
  // GRAPH STRUCTURE VALIDATION
  // ==========================================================================

  /**
   * GRAPH_1: Validate that the strategy is a Directed Acyclic Graph (no cycles)
   */
  private static validateDAG(strategy: Strategy, errors: ValidationRule[]): void {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) {
        return true; // Cycle detected
      }
      if (visited.has(nodeId)) {
        return false; // Already processed
      }

      visited.add(nodeId);
      recStack.add(nodeId);

      // Get all outgoing edges from this node
      const outgoingEdges = strategy.edges.filter((e) => e.source === nodeId);

      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) {
          errors.push({
            rule_id: "GRAPH_1",
            severity: "ERROR",
            message: `Cycle detected in strategy graph involving node "${nodeId}"`,
            node_id: nodeId,
          });
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    // Check all nodes for cycles
    for (const node of strategy.nodes) {
      if (!visited.has(node.id)) {
        hasCycle(node.id);
      }
    }
  }

  /**
   * GRAPH_2: Validate that all nodes are reachable
   */
  private static validateReachability(
    strategy: Strategy,
    warnings: ValidationRule[]
  ): void {
    const borrowNodes = strategy.nodes.filter((n) => n.type === "FLASH_BORROW");

    if (borrowNodes.length === 0) {
      warnings.push({
        rule_id: "GRAPH_NO_BORROW",
        severity: "WARNING",
        message: "Strategy has no FLASH_BORROW nodes",
      });
      return;
    }

    // BFS to find reachable nodes from all borrow nodes
    const reachable = new Set<string>();
    const queue: string[] = borrowNodes.map((n) => n.id);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;

      reachable.add(nodeId);

      const outgoing = strategy.edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    // Find unreachable nodes
    const unreachable = strategy.nodes.filter((n) => !reachable.has(n.id));

    for (const node of unreachable) {
      warnings.push({
        rule_id: "GRAPH_2",
        severity: "WARNING",
        message: `Node "${node.id}" is not reachable from any FLASH_BORROW node`,
        node_id: node.id,
      });
    }
  }

  // ==========================================================================
  // PTB LIMITS VALIDATION
  // ==========================================================================

  /**
   * Validate PTB limits
   */
  private static validatePTBLimits(
    strategy: Strategy,
    errors: ValidationRule[],
    warnings: ValidationRule[]
  ): void {
    // Estimate number of PTB commands
    // Conservative estimate: 5 commands per node
    const estimatedCommands = strategy.nodes.length * 5;

    if (estimatedCommands > 1024) {
      errors.push({
        rule_id: "PTB_1",
        severity: "ERROR",
        message: `Strategy may exceed 1024 PTB command limit (estimated: ${estimatedCommands} commands from ${strategy.nodes.length} nodes)`,
      });
    } else if (estimatedCommands > 800) {
      warnings.push({
        rule_id: "PTB_WARNING",
        severity: "WARNING",
        message: `Strategy is approaching PTB limit (estimated: ${estimatedCommands} commands)`,
      });
    }

    if (strategy.nodes.length > 100) {
      warnings.push({
        rule_id: "PTB_2",
        severity: "WARNING",
        message: `Strategy has many nodes (${strategy.nodes.length}), simulation may be slow`,
      });
    }
  }

  // ==========================================================================
  // REFERENCE VALIDATION
  // ==========================================================================

  /**
   * Validate that all node references exist
   */
  private static validateReferences(strategy: Strategy, errors: ValidationRule[]): void {
    const nodeIds = new Set(strategy.nodes.map((n) => n.id));

    // Validate edges reference valid nodes
    for (const edge of strategy.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          rule_id: "REF_INVALID_SOURCE",
          severity: "ERROR",
          message: `Edge "${edge.id}" references non-existent source node "${edge.source}"`,
          edge_id: edge.id,
        });
      }

      if (!nodeIds.has(edge.target)) {
        errors.push({
          rule_id: "REF_INVALID_TARGET",
          severity: "ERROR",
          message: `Edge "${edge.id}" references non-existent target node "${edge.target}"`,
          edge_id: edge.id,
        });
      }

      // Validate that source_output exists on source node
      if (nodeIds.has(edge.source)) {
        const sourceNode = strategy.nodes.find((n) => n.id === edge.source)!;
        const hasOutput = this.nodeHasOutput(sourceNode, edge.source_output);

        if (!hasOutput) {
          errors.push({
            rule_id: "REF_INVALID_OUTPUT",
            severity: "ERROR",
            message: `Edge "${edge.id}" references non-existent output "${edge.source_output}" on node "${edge.source}"`,
            edge_id: edge.id,
          });
        }
      }
    }
  }

  /**
   * Check if a node has a specific output
   */
  private static nodeHasOutput(node: Node, outputId: string): boolean {
    switch (node.type) {
      case "FLASH_BORROW":
      case "DEX_SWAP":
      case "COIN_SPLIT":
      case "COIN_MERGE":
      case "CUSTOM":
        return node.outputs.some((o) => o.id === outputId);
      case "FLASH_REPAY":
        return false; // Repay nodes have no outputs
      default:
        return false;
    }
  }
}
