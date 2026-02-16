Frontend Updates for Segmentation Fix
To resolve the "Network Error" caused by the long URL, please update the frontend to use the new POST endpoint.

1. Update segmentationApi.ts
Locate the 
getSegmentClients
 function (around line 52) and change it to use api.post.

typescript
// src/api/segmentationApi.ts
// ... existing code ...
export const segmentationApi = {
    // ... other methods ...
    /**
     * [MODIFIED] Switch to POST to handle large clientIds arrays
     */
    async getSegmentClients(
        segmentId: string, 
        params: {
            page: number;
            pageSize: number;
            sortBy: string;
            sortOrder: string;
            clientIds: string[]; // Sent in body
            filters: any;        // Sent in body
            metric: string;
        }
    ) {
        // Use POST instead of GET
        // The second argument is the body (data), the third is config (optional)
        const { data } = await api.post(\`/segmentation/clients/\${segmentId}\`, {
            ...params
        });
        return data;
    },
    // ... other methods ...
};
2. Update segmentationStore.ts
Locate the 
fetchSegmentClients
 action (around line 141) and ensure it passes the parameters correctly.

typescript
// src/stores/segmentationStore.ts
// ... existing code ...
    async fetchSegmentClients(segmentId: string, page = 1) {
        this.loadingClients = true;
        this.currentSegmentId = segmentId;
        try {
            // Find the segment to get its clientIds
            const segment = this.segments.find(s => s.id === segmentId);
            if (!segment) throw new Error('Segment not found');
            // prepare params
            const params = {
                page,
                pageSize: this.pagination.pageSize,
                sortBy: this.pagination.sortBy,
                sortOrder: this.pagination.sortOrder,
                clientIds: segment.clientIds, // Pass the array directly
                filters: this.currentFilters,
                metric: this.currentFilters.metric || 'VENTA_KG'
            };
            // Call the API (now using POST)
            const response = await segmentationApi.getSegmentClients(segmentId, params);
            this.segmentClients = response.clients;
            this.pagination = {
                ...this.pagination,
                ...response.pagination
            };
        } catch (error) {
            console.error('[SegmentationStore] Error fetching clients:', error);
            this.error = 'Error al cargar detalle del segmento';
        } finally {
            this.loadingClients = false;
        }
    }
// ... existing code ...

Comment
Ctrl+Alt+M
