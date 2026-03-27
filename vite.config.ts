import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
      proxy: {
        '/stripe/events': {
          target: 'https://hidden-gecko-710.convex.site',
          changeOrigin: true,
        },
        '/workos-webhook': {
          target: 'https://hidden-gecko-710.convex.site',
          changeOrigin: true,
        },
        '/api/auth': {
          target: 'https://whitelabel.tekimax.ai',
          changeOrigin: true,
        },
        '/api/orgs': {
          target: 'https://whitelabel.tekimax.ai',
          changeOrigin: true,
        },
        '/api': {
          target: 'https://brain-adaptive.adaptivestartup.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    plugins: [react()],
    define: {
      // SA-001: Do NOT inject secrets into client bundle.
      // Client components must call Gemini through Convex server actions.
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React MUST be in a single chunk and loaded first
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-helmet-async/')) {
              return 'vendor-react';
            }
            // These packages have deep React dependencies — keep them in the
            // default chunk (co-located with vendor-react) instead of forcing
            // them into a separate chunk that may initialise before React.
            // @radix-ui/themes and @xyflow/react both set React.Children
            // internally, so they CANNOT be in a separate chunk.
            if (id.includes('node_modules/convex/') || id.includes('node_modules/@convex-dev/')) {
              return 'vendor-convex';
            }
            if (id.includes('node_modules/@tiptap/')) {
              return 'vendor-editor';
            }
            if (id.includes('node_modules/pdfjs-dist/')) {
              return 'vendor-utils';
            }
            if (id.includes('node_modules/@google/')) {
              return 'vendor-ai';
            }
            if (id.includes('node_modules/@stripe/')) {
              return 'vendor-payment';
            }
            // Everything else (authkit, radix, xyflow, framer-motion, lucide, recharts,
            // zustand, sonner, etc.) stays in the default vendor chunk so they
            // share the React singleton without initialisation-order issues.
          }
        }
      }
    }
  };
});
