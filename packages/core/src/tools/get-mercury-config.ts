import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolNames, ToolDisplayNames } from './tool-names.js';
import { ToolErrorType } from './tool-error.js';
import { readFile } from 'fs/promises';

/**
 * Parameters for the GetMercuryConfig tool
 */
export interface GetMercuryConfigToolParams {
  /**
   * The path to the mercury-config.json file. Defaults to C:\\WcsSystem\\mercury-config.json
   */
  configPath?: string;
}

class GetMercuryConfigToolInvocation extends BaseToolInvocation<
  GetMercuryConfigToolParams,
  ToolResult
> {
  constructor(params: GetMercuryConfigToolParams) {
    super(params);
  }

  getDescription(): string {
    return `Reading Mercury configuration file from C:\\WcsSystem\\mercury-config.json`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const configPath =
      this.params.configPath ?? 'C:\\WcsSystem\\mercury-config.json';

    try {
      // Read the configuration file
      const data = await readFile(configPath, 'utf-8');
      const config = JSON.parse(data);

      return {
        llmContent: `Mercury configuration: ${JSON.stringify(config, null, 2)}`,
        returnDisplay: `Successfully read Mercury configuration from ${configPath}`,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return {
          llmContent: `Mercury configuration file not found at ${configPath}. Please ensure the file exists and the path is correct.`,
          returnDisplay: `Configuration file not found at ${configPath}`,
          error: {
            message: `Configuration file not found at ${configPath}`,
            type: ToolErrorType.FILE_NOT_FOUND,
          },
        };
      } else if (error instanceof SyntaxError) {
        return {
          llmContent: `Invalid JSON format in Mercury configuration file at ${configPath}: ${error.message}`,
          returnDisplay: `Invalid JSON format in configuration file`,
          error: {
            message: `Invalid JSON format: ${error.message}`,
            type: ToolErrorType.READ_CONTENT_FAILURE,
          },
        };
      } else {
        return {
          llmContent: `Error reading Mercury configuration file: ${error instanceof Error ? error.message : String(error)}`,
          returnDisplay: `Error reading configuration file`,
          error: {
            message: `Error reading configuration file: ${error instanceof Error ? error.message : String(error)}`,
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }
    }
  }
}

/**
 * Implementation of the GetMercuryConfig tool logic
 */
export class GetMercuryConfigTool extends BaseDeclarativeTool<
  GetMercuryConfigToolParams,
  ToolResult
> {
  static readonly Name: string = ToolNames.GET_MERCURY_CONFIG;

  constructor(_config: Config) {
    super(
      GetMercuryConfigTool.Name,
      ToolDisplayNames.GET_MERCURY_CONFIG,
      'Reads the Mercury system configuration file (mercury-config.json) from the specified path or from C:\\WcsSystem by default. This tool provides access to the core system configuration without requiring manual file searches. It returns the complete configuration object when successful, or appropriate error messages if the file is missing or contains invalid JSON.',
      Kind.Other,
      {
        type: 'object',
        properties: {
          configPath: {
            type: 'string',
            description:
              'The path to the mercury-config.json file. Defaults to C:\\WcsSystem\\mercury-config.json',
          },
        },
        required: [],
      },
    );
  }

  protected override validateToolParamValues(
    _params: GetMercuryConfigToolParams,
  ): string | null {
    // No parameters to validate
    return null;
  }

  protected createInvocation(
    params: GetMercuryConfigToolParams,
  ): ToolInvocation<GetMercuryConfigToolParams, ToolResult> {
    return new GetMercuryConfigToolInvocation(params);
  }
}
