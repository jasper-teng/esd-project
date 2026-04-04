import { getBusRoutes, BusRouteEntry } from "./lta";

let routeCache: Record<string, BusRouteEntry[]> | null = null;

async function getGroupedRoutes() {
    if (routeCache) return routeCache;

    const routes = await getBusRoutes();
    const grouped: Record<string, BusRouteEntry[]> = {};
    for (const entry of routes) {
        const key = `${entry.ServiceNo}-${entry.Direction}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(entry);
    }
    routeCache = grouped;
    return grouped;
}

export async function getDistanceBetweenStops(
    fromStop: string,
    toStop: string
): Promise<{ distance: number; serviceNo: string; direction: number } | null> {
    const grouped = await getGroupedRoutes(); // <-- replaces the getBusRoutes() call + grouping logic

    for (const key in grouped) {
        const stops = grouped[key];
        const from = stops.find(s => s.BusStopCode === fromStop);
        const to = stops.find(s => s.BusStopCode === toStop);

        if (from && to && from.StopSequence < to.StopSequence) {
            return {
                distance: parseFloat((to.Distance - from.Distance).toFixed(2)),
                serviceNo: from.ServiceNo,
                direction: from.Direction
            };
        }
    }

    return null;
}

// export async function getDistanceBetweenStops(
//     fromStop: string,
//     toStop: string
// ): Promise<{ distance: number; serviceNo: string; direction: number } | null> {
//     const routes = await getBusRoutes();

//   // Group routes by service + direction
//     const grouped: Record<string, BusRouteEntry[]> = {};
//     for (const entry of routes) {
//         const key = `${entry.ServiceNo}-${entry.Direction}`;
//         if (!grouped[key]) grouped[key] = [];
//         grouped[key].push(entry);
//     }

//   // Find a route that contains both stops
//     for (const key in grouped) {
//         const stops = grouped[key];
//         const from = stops.find(s => s.BusStopCode === fromStop);
//         const to = stops.find(s => s.BusStopCode === toStop);

//         if (from && to && from.StopSequence < to.StopSequence) {
//             return {
//                 distance: parseFloat((to.Distance - from.Distance).toFixed(2)),
//                 serviceNo: from.ServiceNo,
//                 direction: from.Direction
//             };
//         }
//     }

//   return null; // no common route found
// }