let currentNetwork = null;
let currentGraphData = null;
let currentGraphFile = 'podcast_data.js';
let maxNodesToShow = 400; // Initial limit
let allGraphData = null; // Store full dataset

// Sidebar toggle functionality
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');

sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarToggle.classList.toggle('hidden');
});

sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarToggle.classList.remove('hidden');
});

// Graph selection
document.querySelectorAll('.graph-item:not([disabled])').forEach(button => {
    button.addEventListener('click', function() {
        const graphFile = this.dataset.graph;
        
        // Update active state
        document.querySelectorAll('.graph-item').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Load the selected graph
        loadGraph(graphFile);
    });
});

// Data limit control functionality
function initializeDataControls() {
    const controlsHtml = `
        <div class="data-controls">
            <h3>Graph Controls</h3>
            <div class="control-section">
                <label for="node-limit">Nodes to Display:</label>
                <input type="range" id="node-limit" min="50" max="1000" value="100" step="50">
                <span id="node-limit-value">400</span>
            </div>
            <div class="control-section">
                <label for="cluster-separation">Cluster Separation:</label>
                <input type="range" id="cluster-separation" min="200" max="800" value="400" step="50">
                <span id="cluster-separation-value">400</span>
            </div>
            <button id="apply-changes" class="apply-btn">Apply Changes</button>
            <div class="stats">
                <div>Total Nodes: <span id="total-nodes">0</span></div>
                <div>Showing: <span id="showing-nodes">0</span></div>
                <div>Clusters: <span id="cluster-count">0</span></div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = controlsHtml;
    document.body.appendChild(container);
    
    const style = document.createElement('style');
    style.textContent = `
        .data-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 280px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 12px;
            padding: 20px;
            color: white;
            font-family: 'Inter', system-ui, sans-serif;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            z-index: 1000;
        }
        
        .data-controls h3 {
            margin: 0 0 16px 0;
            color: #6366f1;
            font-size: 16px;
            font-weight: 600;
        }
        
        .control-section {
            margin-bottom: 16px;
        }
        
        .control-section label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            color: #e2e8f0;
        }
        
        .control-section input[type="range"] {
            width: 100%;
            margin-bottom: 6px;
            accent-color: #6366f1;
        }
        
        .control-section span {
            font-weight: 600;
            color: #6366f1;
        }
        
        .apply-btn {
            width: 100%;
            background: linear-gradient(45deg, #6366f1, #8b5cf6);
            border: none;
            border-radius: 8px;
            color: white;
            padding: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 16px;
            transition: all 0.2s;
        }
        
        .apply-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }
        
        .stats {
            font-size: 12px;
            color: #94a3b8;
        }
        
        .stats div {
            margin-bottom: 4px;
        }
        
        .stats span {
            color: #6366f1;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
    
    const nodeLimitSlider = document.getElementById('node-limit');
    const nodeLimitValue = document.getElementById('node-limit-value');
    const clusterSeparationSlider = document.getElementById('cluster-separation');
    const clusterSeparationValue = document.getElementById('cluster-separation-value');
    const applyButton = document.getElementById('apply-changes');
    
    nodeLimitSlider.addEventListener('input', (e) => {
        nodeLimitValue.textContent = e.target.value;
    });
    
    clusterSeparationSlider.addEventListener('input', (e) => {
        clusterSeparationValue.textContent = e.target.value;
    });
    
    applyButton.addEventListener('click', () => {
        maxNodesToShow = parseInt(nodeLimitSlider.value);
        const clusterSeparation = parseInt(clusterSeparationSlider.value);
        
        if (allGraphData) {
            updateGraphWithLimits(allGraphData, maxNodesToShow, clusterSeparation);
        }
    });
}

function showStatus(text, detail = '', progress = '') {
    const overlay = document.getElementById('status-overlay');
    const statusText = document.getElementById('status-text');
    const statusDetail = document.getElementById('status-detail');
    const statusProgress = document.getElementById('status-progress');
    
    if (statusText) statusText.textContent = text;
    if (statusDetail) statusDetail.textContent = detail;
    if (statusProgress) statusProgress.textContent = progress;
    if (overlay) overlay.classList.add('visible');
}

function hideStatus() {
    const overlay = document.getElementById('status-overlay');
    if (overlay) overlay.classList.remove('visible');
}

function updateStats(totalNodes, showingNodes, clusterCount) {
    document.getElementById('total-nodes').textContent = totalNodes;
    document.getElementById('showing-nodes').textContent = showingNodes;
    document.getElementById('cluster-count').textContent = clusterCount;
    
    if (document.getElementById('node-count')) document.getElementById('node-count').textContent = showingNodes;
    if (document.getElementById('edge-count')) {
        const edges = currentGraphData ? currentGraphData.edges.length : 0;
        document.getElementById('edge-count').textContent = edges;
    }
}

function loadGraph(graphFile) {
    console.log("LEADING SOCIAL GRAPH ", graphFile)
    showStatus('Loading graph...', 'Fetching data...');
    
    const oldScript = document.querySelector(`script[src*="data.js"]`);
    if (oldScript) oldScript.remove();
    
    if (currentNetwork) {
        currentNetwork.destroy();
        currentNetwork = null;
    }
    
    window.networkData = null;
    
    const script = document.createElement('script');
    script.src = './' + graphFile;
    script.onload = function() {
        if (typeof networkData === 'undefined' || !networkData) {
            showStatus('Error', 'Failed to load graph data');
            setTimeout(hideStatus, 3000);
            return;
        }
        
        currentGraphFile = graphFile;
        allGraphData = networkData;
        
        const nodeLimitSlider = document.getElementById('node-limit');
        if (nodeLimitSlider && networkData.nodes) {
            nodeLimitSlider.max = networkData.nodes.length;
            if (parseInt(nodeLimitSlider.value) > networkData.nodes.length) {
                nodeLimitSlider.value = Math.min(500, networkData.nodes.length);
                document.getElementById('node-limit-value').textContent = nodeLimitSlider.value;
                maxNodesToShow = parseInt(nodeLimitSlider.value);
            }
        }
        
        updateGraphWithLimits(networkData, maxNodesToShow, 400);
    };
    
    script.onerror = () => {
        showStatus('Error', `Could not load ${graphFile}`);
        setTimeout(hideStatus, 3000);
    };
    
    document.head.appendChild(script);
}

function updateGraphWithLimits(data, nodeLimit, clusterSeparation) {
    showStatus('Filtering data...', 'Selecting top nodes...', '5%');
    
    const nodeDegrees = {};
    data.nodes.forEach(node => {
        nodeDegrees[node.id] = 0;
    });
    
    data.edges.forEach(edge => {
        nodeDegrees[edge.from] = (nodeDegrees[edge.from] || 0) + 1;
        nodeDegrees[edge.to] = (nodeDegrees[edge.to] || 0) + 1;
    });
    
    const sortedNodes = data.nodes
        .map(node => ({ ...node, degree: nodeDegrees[node.id] || 0 }))
        .sort((a, b) => b.degree - a.degree)
        .slice(0, nodeLimit);
    
    const selectedNodeIds = new Set(sortedNodes.map(node => node.id));
    const filteredEdges = data.edges.filter(edge => 
        selectedNodeIds.has(edge.from) && selectedNodeIds.has(edge.to)
    );
    
    const filteredNodeDegrees = {};
    sortedNodes.forEach(node => {
        filteredNodeDegrees[node.id] = 0;
    });
    
    filteredEdges.forEach(edge => {
        filteredNodeDegrees[edge.from] = (filteredNodeDegrees[edge.from] || 0) + 1;
        filteredNodeDegrees[edge.to] = (filteredNodeDegrees[edge.to] || 0) + 1;
    });
    
    initializeGraph({
        nodes: sortedNodes,
        edges: filteredEdges
    }, filteredNodeDegrees, clusterSeparation);
}

function initializeGraph(data, nodeDegrees, clusterSeparation = 400) {
    const container = document.getElementById('mynetwork');
    const startTime = performance.now();
    
    showStatus('Building graph...', 'Processing data...', '10%');
    
    const degrees = Object.values(nodeDegrees);
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);
    
    showStatus('Building graph...', 'Detecting clusters...', '20%');
    
    // Point 1: Enhanced cluster detection for MORE clusters
    const clusters = enhancedClusterDetection(data.nodes, data.edges, nodeDegrees);
    
    showStatus('Building graph...', 'Generating distinct colors...', '30%');
    
    // Point 2: Generate visually distinct colors for any number of clusters
    const uniqueClusters = Array.from(new Set(Object.values(clusters)));
    const distinctColors = generateHighContrastColors(uniqueClusters.length);
    const clusterColors = {};
    uniqueClusters.forEach((clusterId, index) => {
        clusterColors[clusterId] = distinctColors[index];
    });
    
    showStatus('Building graph...', 'Preparing nodes...', '40%');
    
    const enhancedNodes = data.nodes.map(node => {
        const degree = nodeDegrees[node.id] || 1;
        const clusterId = clusters[node.id] || 0;
        const nodeColor = clusterColors[clusterId] || '#6366f1';
        
        let size;
        if (maxDegree === minDegree) {
            size = 25;
        } else {
            const normalizedDegree = (Math.sqrt(degree) - Math.sqrt(minDegree)) / 
                                   (Math.sqrt(maxDegree) - Math.sqrt(minDegree));
            size = 15 + (normalizedDegree * 60);
        }
        
        let fontSize;
        if (maxDegree === minDegree) {
            fontSize = 12;
        } else {
            const normalizedDegree = (degree - minDegree) / (maxDegree - minDegree);
            fontSize = 10 + (normalizedDegree * 16);
        }
        
        return {
            ...node,
            size: size,
            font: {
                size: fontSize,
                color: '#000000',
                face: 'Inter, system-ui, sans-serif',
                strokeWidth: 1,
                strokeColor: '#ffffff'
            },
            color: {
                background: nodeColor,
                border: '#000000', // FIXED: Always black border for ALL nodes
                highlight: {
                    background: lightenColor(nodeColor, 25),
                    border: '#000000' // FIXED: Black border on highlight too
                }
            },
            borderWidth: 2, // FIXED: Consistent border width for all nodes
            degree: degree
        };
    });
    
    showStatus('Building graph...', 'Creating network...', '50%');
    
    currentGraphData = {
        nodes: enhancedNodes,
        edges: data.edges
    };
    
    // Group edges by connection pair for multiple videos support
    const edgeGroups = {};
    data.edges.forEach(edge => {
        const key = [edge.from, edge.to].sort().join('-'); // Create consistent key regardless of direction
        if (!edgeGroups[key]) {
            edgeGroups[key] = [];
        }
        edgeGroups[key].push(edge);
    });
    
    // Create edges for visualization (one visual edge per connection pair)
    const visualEdges = Object.entries(edgeGroups).map(([key, edges]) => {
        const firstEdge = edges[0];
        return {
            id: key,
            from: firstEdge.from,
            to: firstEdge.to,
            width: Math.min(1.5 + (edges.length * 0.5), 5), // Thicker line for multiple connections
            color: {
                color: 'rgba(100, 116, 139, 0.4)',
                highlight: '#6366f1'
            },
            videos: edges // Store all videos for this connection
        };
    });
    
    const graphData = {
        nodes: new vis.DataSet(enhancedNodes),
        edges: new vis.DataSet(visualEdges)
    };
    
    const options = {
        nodes: {
            shape: 'dot',
            shadow: {
                enabled: true,
                color: 'rgba(0,0,0,0.3)',
                size: 10,
                x: 2,
                y: 2
            }
        },
        edges: {
            smooth: {
                type: 'continuous',
                forceDirection: 'none'
            },
            selectionWidth: 3
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -150,
                centralGravity: 0.005,
                springLength: clusterSeparation,
                springConstant: 0.08,
                damping: 0.4
            },
            stabilization: {
                enabled: true,
                iterations: 200,
                updateInterval: 15
            }
        },
        interaction: {
            hover: true,
            tooltipDelay: 100,
            dragNodes: true,
            zoomView: true,
            dragView: true
        }
    };
    
    currentNetwork = new vis.Network(container, graphData, options);
    
    // FIXED: Only trigger video modal when clicking EDGES, not nodes
    currentNetwork.on("click", function(params) {
        // Only proceed if an edge was clicked AND no nodes were clicked
        if (params.edges.length > 0 && params.nodes.length === 0) {
            const edgeId = params.edges[0];
            const edgeData = graphData.edges.get(edgeId);
            
            // Show modal with all videos for this connection
            if (edgeData && edgeData.videos && edgeData.videos.length > 0) {
                openVideoModal(edgeData.videos);
            }
        }
        // If nodes were clicked (with or without edges), do nothing
    });
    
    currentNetwork.on("stabilizationProgress", function(params) {
        const pct = Math.round((params.iterations / params.total) * 100);
        const progressPct = 50 + Math.round(pct * 0.4);
        showStatus('Stabilizing layout...', `Iteration ${params.iterations} of ${params.total}`, `${progressPct}%`);
    });
    
    currentNetwork.on("stabilizationIterationsDone", function() {
        currentNetwork.setOptions({ physics: false });
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        showStatus('Ready!', `Loaded ${data.nodes.length} nodes in ${elapsed}s`, '100%');
        setTimeout(hideStatus, 2000);
    });
    
    updateStats(
        allGraphData ? allGraphData.nodes.length : data.nodes.length,
        data.nodes.length,
        uniqueClusters.length
    );
}

// FIXED: YouTube Modal Logic for Multiple Videos
function openVideoModal(videos) {
    const modal = document.createElement('div');
    modal.id = 'dynamic-video-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(10px);
    `;
    
    // Create scrollable container for multiple videos
    const videoList = videos.map((video, index) => `
        <div style="
            margin-bottom: ${index < videos.length - 1 ? '30px' : '0'};
            border-bottom: ${index < videos.length - 1 ? '1px solid #e0e0e0' : 'none'};
            padding-bottom: ${index < videos.length - 1 ? '20px' : '0'};
        ">
            <h4 style="
                margin: 0 0 15px 0; 
                color: #333; 
                font-size: 18px;
                font-weight: 600;
            ">${video.title}</h4>
            <iframe width="800" height="450" 
                    src="https://www.youtube.com/embed/${video.post_id}" 
                    frameborder="0" 
                    allowfullscreen 
                    style="
                        max-width: 100%; 
                        max-height: 50vh;
                        border-radius: 8px;
                    ">
            </iframe>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90%;
            max-height: 90%;
            position: relative;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            overflow-y: auto;
        ">
            <button id="close-modal" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
                z-index: 1;
            " onmouseover="this.style.backgroundColor='#f0f0f0'" 
               onmouseout="this.style.backgroundColor='transparent'">✕</button>
            
            <div style="margin-right: 40px;">
                ${videos.length > 1 ? 
                    `<h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">
                        ${videos.length} Collaborations
                    </h3>` : ''
                }
                ${videoList}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close and destroy to prevent background memory usage
    const destroyModal = () => modal.remove();
    document.getElementById('close-modal').onclick = destroyModal;
    modal.onclick = (e) => {
        if(e.target === modal) destroyModal();
    };
}

// Point 1: Enhanced clustering (Lowered resolution for more groups)
function enhancedClusterDetection(nodes, edges, nodeDegrees) {
    const adjacency = {};
    nodes.forEach(node => {
        adjacency[node.id] = {};
    });
    
    edges.forEach(edge => {
        adjacency[edge.from][edge.to] = (adjacency[edge.from][edge.to] || 0) + 1;
        adjacency[edge.to][edge.from] = (adjacency[edge.to][edge.from] || 0) + 1;
    });
    
    const clusters = {};
    nodes.forEach((node, index) => {
        clusters[node.id] = index;
    });
    
    let improved = true;
    let iteration = 0;
    const resolution = 0.5; // Lower resolution = MORE clusters
    
    while (improved && iteration < 10) {
        improved = false;
        iteration++;
        
        const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
        
        for (const node of shuffledNodes) {
            const nodeId = node.id;
            const currentCluster = clusters[nodeId];
            const neighbors = Object.keys(adjacency[nodeId] || {});
            
            if (neighbors.length === 0) continue;
            
            const clusterConnections = {};
            neighbors.forEach(nId => {
                const cId = clusters[nId];
                clusterConnections[cId] = (clusterConnections[cId] || 0) + adjacency[nodeId][nId];
            });
            
            let bestCluster = currentCluster;
            let bestScore = (clusterConnections[currentCluster] || 0) * (1 / resolution);
            
            Object.entries(clusterConnections).forEach(([cId, score]) => {
                if (score > bestScore) {
                    bestScore = score;
                    bestCluster = parseInt(cId);
                    improved = true;
                }
            });
            
            clusters[nodeId] = bestCluster;
        }
    }
    
    // Relabel sequentially
    const uniqueIds = [...new Set(Object.values(clusters))];
    const mapping = {};
    uniqueIds.forEach((oldId, i) => mapping[oldId] = i);
    Object.keys(clusters).forEach(nodeId => clusters[nodeId] = mapping[clusters[nodeId]]);
    
    return clusters;
}

// Point 2: Generate high-contrast colors using Golden Angle
function generateHighContrastColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 137.508) % 360;
        colors.push(`hsl(${hue}, 70%, 55%)`);
    }
    return colors;
}

function darkenColor(color, percent) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) return `hsl(${match[1]}, ${match[2]}%, ${Math.max(0, parseInt(match[3]) - percent)}%)`;
    return color;
}

function lightenColor(color, percent) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) return `hsl(${match[1]}, ${match[2]}%, ${Math.min(100, parseInt(match[3]) + percent)}%)`;
    return color;
}

document.addEventListener('DOMContentLoaded', function() {
    initializeDataControls();
    loadGraph(currentGraphFile);
});