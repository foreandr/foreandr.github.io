// graphData.js

// IMPORTANT: This file assumes the following files have been loaded via <script> tags:
// 1. algebra.js
// 2. analysis.js
// 3. topology-geometry.js
// All nodes and edges from those files are now available as global constants.

// --- 1. MERGE ALL NODES AND DEDUPLICATE ---
const all_nodes_temp = [
    ...algebra_nodes, 
    ...analysis_nodes, 
    ...topogeo_nodes
];

// Use a Map to ensure only one node definition per unique ID is kept.
const nodesMap = new Map();
all_nodes_temp.forEach(node => {
    if (!nodesMap.has(node.id)) {
        nodesMap.set(node.id, node);
    }
});

const nodesArray = Array.from(nodesMap.values());

// --- 2. MERGE ALL EDGES ---
const edgesArray = [
    ...algebra_edges, 
    ...analysis_edges, 
    ...topogeo_edges
];

// --- 3. FINAL DATA OBJECT FOR VISUALIZATION LIBRARY ---
// This is the variable the main visualization script will use.
var graphData = {
    nodes: new vis.DataSet(nodesArray),
    edges: new vis.DataSet(edgesArray)
};

// NOTE: We wrap the arrays in vis.DataSet objects here, which is necessary for vis.js.