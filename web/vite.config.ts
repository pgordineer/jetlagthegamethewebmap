import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': 'http://localhost:5001'
        }
    },
    base: '/jetlagthegamethewebmap/',
    build: {
        rollupOptions: {
            external: [
                'leaflet.markercluster',
                'leaflet.markercluster/dist/MarkerCluster.css',
                'leaflet.markercluster/dist/MarkerCluster.Default.css'
            ]
        }
    }
});
