/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolNames, ToolDisplayNames } from './tool-names.js';
import { ToolErrorType } from './tool-error.js';

/**
 * Parameters for the ReadEnvVar tool
 */
export interface ReadEnvVarToolParams {
  /**
   * The name of the environment variable to read
   */
  var_name: string;
}

class ReadEnvVarToolInvocation extends BaseToolInvocation<
  ReadEnvVarToolParams,
  ToolResult
> {
  constructor(params: ReadEnvVarToolParams) {
    super(params);
  }

  getDescription(): string {
    return `Reading environment variable: ${this.params.var_name}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const varName = this.params.var_name;

    // Read the environment variable
    const value = process.env[varName];

    if (value === undefined) {
      return {
        llmContent: `Environment variable "${varName}" is not set.`,
        returnDisplay: `Environment variable "${varName}" is not set.`,
        error: {
          message: `Environment variable "${varName}" not found`,
          type: ToolErrorType.ENV_VAR_NOT_FOUND,
        },
      };
    }

    // Mask sensitive environment variables in display but show in LLM content
    let maskedValue = value;
    if (
      varName.toLowerCase().includes('key') ||
      varName.toLowerCase().includes('secret') ||
      varName.toLowerCase().includes('password') ||
      varName.toLowerCase().includes('token') ||
      varName.toLowerCase().includes('api')
    ) {
      // Display masked value to user but full value to LLM
      maskedValue = '*'.repeat(Math.min(value.length, 20));
    }

    const llmContent = `Environment variable "${varName}" has value: "${value}"`;
    const returnDisplay = `Environment variable "${varName}" has value: "${maskedValue}"`;

    return {
      llmContent,
      returnDisplay,
    };
  }
}

/**
 * Implementation of the ReadEnvVar tool logic
 */
export class ReadEnvVarTool extends BaseDeclarativeTool<
  ReadEnvVarToolParams,
  ToolResult
> {
  static readonly Name: string = ToolNames.READ_ENV_VAR;

  constructor(_config: Config) {
    super(
      ReadEnvVarTool.Name,
      ToolDisplayNames.READ_ENV_VAR,
      "Reads the value of a specified environment variable. This tool only returns the value of the environment variable if it exists, otherwise it returns an error. For security reasons, sensitive environment variables (containing words like 'key', 'secret', 'password', 'token', or 'api') will be masked in the display but available to the model.",
      Kind.Other,
      {
        type: 'object',
        properties: {
          var_name: {
            type: 'string',
            description:
              'The name of the environment variable to read (e.g., "PATH", "HOME", "WcsRuntimePath").',
          },
        },
        required: ['var_name'],
      },
    );
  }

  protected override validateToolParamValues(
    params: ReadEnvVarToolParams,
  ): string | null {
    if (!params.var_name || params.var_name.trim() === '') {
      return 'Environment variable name cannot be empty.';
    }

    // Basic validation to ensure it looks like a valid environment variable name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(params.var_name)) {
      return `Environment variable name "${params.var_name}" is not valid. Environment variable names must start with a letter or underscore and contain only letters, digits, and underscores.`;
    }

    return null;
  }

  protected createInvocation(
    params: ReadEnvVarToolParams,
  ): ToolInvocation<ReadEnvVarToolParams, ToolResult> {
    return new ReadEnvVarToolInvocation(params);
  }
}
