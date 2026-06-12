import http from 'node:http';
import https from 'node:https';
import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_API_PROXY_TARGET = 'http://192.168.21.14:8000';
const API_PROXY_TIMEOUT_MS = 5_000;
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

class ApiProxyTimeoutError extends Error {
  constructor() {
    super('API proxy timeout');
    this.name = 'ApiProxyTimeoutError';
  }
}

function getApiProxyTarget() {
  return (process.env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET).replace(/\/+$/, '');
}

function buildTargetUrl(request: NextRequest, path: string[]) {
  const targetUrl = new URL(`${getApiProxyTarget()}/api/v1/${path.map(encodeURIComponent).join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  return targetUrl;
}

function buildProxyHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  HOP_BY_HOP_HEADERS.forEach(header => headers.delete(header));
  headers.set('accept', request.headers.get('accept') || 'application/json');

  return headers;
}

function buildResponseHeaders(headers: Headers) {
  const responseHeaders = new Headers(headers);

  HOP_BY_HOP_HEADERS.forEach(header => responseHeaders.delete(header));

  return responseHeaders;
}

function toOutgoingHeaders(headers: Headers) {
  const outgoingHeaders: Record<string, string> = {};

  headers.forEach((value, key) => {
    outgoingHeaders[key] = value;
  });
  outgoingHeaders['accept-encoding'] = 'identity';

  return outgoingHeaders;
}

function toResponseHeaders(headers: http.IncomingHttpHeaders) {
  const responseHeaders = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    if (!value || HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;

    if (Array.isArray(value)) {
      value.forEach(item => responseHeaders.append(key, item));
      return;
    }

    responseHeaders.set(key, value);
  });

  return responseHeaders;
}

function requestBackend(
  targetUrl: URL,
  method: string,
  headers: Headers,
  body?: ArrayBuffer
): Promise<{ body: Buffer; headers: Headers; status: number; statusText: string }> {
  return new Promise((resolve, reject) => {
    const client = targetUrl.protocol === 'https:' ? https : http;
    const request = client.request(
      targetUrl,
      {
        method,
        headers: toOutgoingHeaders(headers),
        timeout: API_PROXY_TIMEOUT_MS,
      },
      response => {
        const chunks: Buffer[] = [];

        response.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks),
            headers: toResponseHeaders(response.headers),
            status: response.statusCode ?? 502,
            statusText: response.statusMessage || 'Bad Gateway',
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new ApiProxyTimeoutError());
    });
    request.on('error', reject);

    if (body && body.byteLength > 0) {
      request.write(Buffer.from(body));
    }

    request.end();
  });
}

async function proxyApiRequest(request: NextRequest, context: { params: { path: string[] } }) {
  try {
    const method = request.method.toUpperCase();
    const response = await requestBackend(
      buildTargetUrl(request, context.params.path),
      method,
      buildProxyHeaders(request),
      method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()
    );

    const responseBody = response.body.buffer.slice(
      response.body.byteOffset,
      response.body.byteOffset + response.body.byteLength
    ) as ArrayBuffer;

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: buildResponseHeaders(response.headers),
    });
  } catch (error) {
    const isTimeout = error instanceof ApiProxyTimeoutError;
    const proxyTarget = getApiProxyTarget();

    return NextResponse.json(
      {
        code: 503,
        msg: isTimeout
          ? `后端服务连接超时，请确认 API_PROXY_TARGET=${proxyTarget} 可以访问`
          : `后端服务连接失败，请确认 API_PROXY_TARGET=${proxyTarget} 已启动且地址正确`,
        data: null,
      },
      { status: 503 }
    );
  }
}

export const GET = proxyApiRequest;
export const POST = proxyApiRequest;
export const PUT = proxyApiRequest;
export const PATCH = proxyApiRequest;
export const DELETE = proxyApiRequest;
export const HEAD = proxyApiRequest;
