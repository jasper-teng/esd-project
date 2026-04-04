const LTA_API_KEY = "3p/VdvbPSRSXHzQKrtBa1Q==";
const BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice";

export interface BusRouteEntry {
    ServiceNo: string;
    Direction: number;
    StopSequence: number;
    BusStopCode: string;
    Distance: number;
}

export async function getBusRoutes(): Promise<BusRouteEntry[]> {
    const results: BusRouteEntry[] = [];
    let skip = 0;

    while (true) {
        const res = await fetch(`${BASE_URL}/BusRoutes?$skip=${skip}`, {
            headers: { AccountKey: LTA_API_KEY }
        });
        const text = await res.text();
        console.log(text); // see what LTA is actually returning
        const data = JSON.parse(text);
        // const data = await res.json();
        const batch = data.value;

        if (!batch || batch.length === 0) break;
        results.push(...batch);
        skip += 500;
    }

    return results;
}
