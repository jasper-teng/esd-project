import { graph } from "./stations";

export function dijkstra(start: string, end: string) {
  const distances: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();

  for (const node in graph) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[start] = 0;

  while (true) {
  // Pick unvisited node with smallest distance
  let current = "";
  let minDist = Infinity;
  
  for (const node in distances) {
    if (!visited.has(node) && distances[node] < minDist) {
      current = node;
      minDist = distances[node];
    }
  }

  if (!current || current === end || minDist === Infinity) break;
  visited.add(current);

  for (const [neighbor, weight] of graph[current]) {  // No fallback needed
    const newDist = distances[current] + weight;
    if (newDist < distances[neighbor]) {
      distances[neighbor] = newDist;
      prev[neighbor] = current;
    }
  }
}

  // Reconstruct path
  const path: string[] = [];
  let cur: string | null = end;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }

  return { distance: distances[end], path };
}