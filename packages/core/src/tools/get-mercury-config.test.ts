import { describe, it, expect, vi } from 'vitest';
import { GetMercuryConfigTool } from './get-mercury-config.js';
import type { Config } from '../config/config.js';
import { ToolNames } from './tool-names.js';

// Mock the fs module
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

const mockReadFile =
  await vi.importActual<typeof import('fs/promises')>('fs/promises');

describe('GetMercuryConfigTool', () => {
  let tool: GetMercuryConfigTool;
  const mockConfig = {} as Config;

  beforeEach(() => {
    tool = new GetMercuryConfigTool(mockConfig);
    vi.clearAllMocks();
  });

  it('should have correct static properties', () => {
    expect(GetMercuryConfigTool.Name).toBe(ToolNames.GET_MERCURY_CONFIG);
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe(ToolNames.GET_MERCURY_CONFIG);
    expect(tool.displayName).toBe('GetMercuryConfig');
    expect(tool.description).toContain(
      'Reads the Mercury system configuration file',
    );
  });

  describe('execute', () => {
    it('should successfully read mercury-config.json and return config', async () => {
      const mockConfigData = { key: 'value' };
      (mockReadFile.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(mockConfigData),
      );

      // Create an invocation through the tool's build method
      const invocation = tool.build({});
      const result = await invocation.execute(new AbortController().signal);

      expect(result.llmContent).toContain(
        'Mercury configuration: {"key":"value"}',
      );
      expect(result.returnDisplay).toContain(
        'Successfully read Mercury configuration from C:\\WcsSystem\\mercury-config.json',
      );
    });

    it('should use custom config path when provided', async () => {
      const mockConfigData = { key: 'custom_value' };
      (mockReadFile.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(mockConfigData),
      );

      // Create an invocation with custom path
      const invocation = tool.build({
        configPath: '/custom/path/mercury-config.json',
      });
      const result = await invocation.execute(new AbortController().signal);

      expect(mockReadFile.readFile).toHaveBeenCalledWith(
        '/custom/path/mercury-config.json',
        'utf-8',
      );
      expect(result.llmContent).toContain(
        'Mercury configuration: {"key":"custom_value"}',
      );
      expect(result.returnDisplay).toContain(
        'Successfully read Mercury configuration from /custom/path/mercury-config.json',
      );
    });

    it('should handle file not found error with custom path', async () => {
      (mockReadFile.readFile as ReturnType<typeof vi.fn>).mockRejectedValue({
        code: 'ENOENT',
      });

      // Create an invocation with custom path
      const invocation = tool.build({
        configPath: '/custom/path/mercury-config.json',
      });
      const result = await invocation.execute(new AbortController().signal);

      expect(result.llmContent).toContain(
        'Mercury configuration file not found at /custom/path/mercury-config.json',
      );
      expect(result.error?.type).toBe('FILE_NOT_FOUND');
    });

    it('should handle invalid JSON error', async () => {
      (mockReadFile.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        '{invalid json}',
      );

      const invocation = tool.build({});
      const result = await invocation.execute(new AbortController().signal);

      expect(result.llmContent).toContain(
        'Invalid JSON format in Mercury configuration file',
      );
      expect(result.error?.type).toBe('INVALID_JSON');
    });

    it('should handle other errors', async () => {
      (mockReadFile.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Unknown error'),
      );

      const invocation = tool.build({});
      const result = await invocation.execute(new AbortController().signal);

      expect(result.llmContent).toContain(
        'Error reading Mercury configuration file',
      );
      expect(result.error?.type).toBe('UNKNOWN_ERROR');
    });
  });
});
