<?php

declare(strict_types=1);

namespace Flowlyra\Sdk;

final class Client
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct(string $apiKey, string $baseUrl = 'http://localhost:8000/api/v1')
    {
        if ($apiKey === '') {
            throw new \InvalidArgumentException('apiKey is required');
        }
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function listChats(array $query = []): array
    {
        return $this->request('GET', '/platform/chats', null, $query);
    }

    public function listMessages(string $chatId): array
    {
        return $this->request('GET', '/platform/chats/' . $chatId . '/messages');
    }

    public function sendMessage(string $chatId, string $content): array
    {
        return $this->request('POST', '/platform/chats/' . $chatId . '/messages', ['content' => $content]);
    }

    public function apiStatus(): array
    {
        return $this->request('GET', '/platform/status');
    }

    private function request(string $method, string $path, ?array $payload = null, array $query = []): array
    {
        $url = $this->baseUrl . $path;
        if ($query !== []) {
            $url .= '?' . http_build_query($query);
        }

        $headers = [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_THROW_ON_ERROR));
        }

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($raw === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException('FlowLyra request failed: ' . $error);
        }
        curl_close($ch);

        if ($status >= 400) {
            throw new \RuntimeException('FlowLyra API error ' . $status . ': ' . $raw);
        }

        return $raw === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    }
}
