import type { NextConfig } from 'next';
import path from 'path';

const isBaristaDev =
  process.env.PORT === '3002' ||
  process.argv.includes('3002') ||
  process.env.BARISTA_DEV === 'true';

const isDockerBuild = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  // Khi chạy port 3002, dùng thư mục cache riêng để không xung đột file manifest với port 3000
  distDir: isBaristaDev ? '.next-barista' : '.next',
  // Chỉ bật standalone và outputFileTracingRoot khi build Docker image; trên Vercel để tự động theo Root Directory
  ...(isDockerBuild
    ? {
        output: 'standalone' as const,
        outputFileTracingRoot: path.resolve(__dirname, '..'),
      }
    : {}),
  // Chuyển tiếp route /health từ frontend (port 3000) sang backend (port 3001) để máy người dùng kiểm tra trực tiếp
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    return [
      {
        source: '/health',
        destination: `${apiUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
