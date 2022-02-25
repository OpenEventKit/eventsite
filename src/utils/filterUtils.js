export const syncFilters = (newFilters, currentFilters) => {
    // new filters are the source of truth
    Object.entries(newFilters).forEach(([key, value]) => {
        if(currentFilters.hasOwnProperty(key)) {
            // copy over values and options if they exists
            let filter = currentFilters[key];
            if(filter.hasOwnProperty("values"))
                value.values = filter.values;
            if(filter.hasOwnProperty("options"))
                value.options = filter.options;
        }
    });
    return newFilters;
}

export const filterByTrackGroup = (originalEvents, currentTrackGroupId = 0) => {
    console.log(`filterByTrackGroup currentTrackGroupId ${currentTrackGroupId} originalEvents ${originalEvents.length}`);
    if (currentTrackGroupId === 0) return originalEvents;
    let res =  originalEvents.filter((ev) => {
        return ev?.track?.track_groups.includes(currentTrackGroupId);
    });
    console.log(`filterByTrackGroup currentTrackGroupId ${currentTrackGroupId} originalEvents ${originalEvents.length} filtered ${res.length}`);
    return res;
}

export const randomSort = (array) => {
    return array.map((a) => [Math.random(),a]).sort((a,b) => a[0]-b[0]).map((a) => a[1]);
}