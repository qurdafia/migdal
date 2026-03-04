import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This perfectly mimics your production Nginx routing!
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Your local Django server
        changeOrigin: true,
        secure: false,
      }
    }
  }
})



// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
