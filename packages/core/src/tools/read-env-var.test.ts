/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../config/config.js';
import { ReadEnvVarTool } from './read-env-var.js';
import { ToolErrorType } from './tool-error.js';

describe('ReadEnvVarTool', () => {
  let config: Config;
  let tool: ReadEnvVarTool;

  beforeEach(() => {
    config = {
      getTargetDir: () => '/tmp',
      getTruncateToolOutputThreshold: () => 25000,
      getTruncateToolOutputLines: () => 1000,
    } as unknown as Config;
    tool = new ReadEnvVarTool(config);
  });

  it('should have correct static Name', () => {
    expect(ReadEnvVarTool.Name).toBe('read_env_var');
  });

  it('should have correct name, displayName and description', () => {
    expect(tool.name).toBe('read_env_var');
    expect(tool.displayName).toBe('ReadEnvVar');
    expect(tool.description).toContain(
      'Reads the value of a specified environment variable',
    );
  });

  describe('validateToolParams', () => {
    it('should return error for empty var_name', () => {
      const result = tool.validateToolParams({ var_name: '' });
      expect(result).toContain('Environment variable name cannot be empty');
    });

    it('should return error for invalid var_name format', () => {
      const result = tool.validateToolParams({ var_name: '123invalid' });
      expect(result).toContain('is not valid');
      expect(result).toContain('must start with a letter or underscore');
    });

    it('should return error for var_name with invalid characters', () => {
      const result = tool.validateToolParams({ var_name: 'invalid-var' });
      expect(result).toContain('is not valid');
      expect(result).toContain('contain only letters, digits, and underscores');
    });

    it('should return null for valid var_name', () => {
      const result = tool.validateToolParams({ var_name: 'VALID_VAR_NAME' });
      expect(result).toBeNull();
    });

    it('should return null for valid var_name starting with underscore', () => {
      const result = tool.validateToolParams({ var_name: '_UNDERSCORE_VAR' });
      expect(result).toBeNull();
    });
  });

  describe('build and execute', () => {
    it('should build and execute successfully for existing environment variable', async () => {
      // Set up an environment variable for testing
      const testVar = 'TEST_READ_ENV_VAR_FOO';
      const testValue = 'test_value_123';
      process.env[testVar] = testValue;

      try {
        const invocation = tool.build({ var_name: testVar });
        const result = await invocation.execute(new AbortController().signal);

        expect(result.llmContent).toBe(
          `Environment variable "${testVar}" has value: "${testValue}"`,
        );
        expect(result.returnDisplay).toBe(
          `Environment variable "${testVar}" has value: "${testValue}"`,
        );
        expect(result.error).toBeUndefined();
      } finally {
        // Clean up the test environment variable
        delete process.env[testVar];
      }
    });

    it('should mask sensitive environment variables in returnDisplay but not llmContent', async () => {
      const sensitiveVar = 'API_KEY_TEST_VAR';
      const sensitiveValue = 'super_secret_api_key_value';
      process.env[sensitiveVar] = sensitiveValue;

      try {
        const invocation = tool.build({ var_name: sensitiveVar });
        const result = await invocation.execute(new AbortController().signal);

        expect(result.llmContent).toBe(
          `Environment variable "${sensitiveVar}" has value: "${sensitiveValue}"`,
        );
        expect(result.returnDisplay).toBe(
          `Environment variable "${sensitiveVar}" has value: "${'*'.repeat(Math.min(sensitiveValue.length, 20))}"`,
        );
        expect(result.error).toBeUndefined();
      } finally {
        delete process.env[sensitiveVar];
      }
    });

    it('should mask environment variables containing sensitive keywords', async () => {
      const testCases = [
        { varName: 'SECRET_PASSWORD', value: 'my_secret_password' },
        { varName: 'MY_TOKEN_VALUE', value: 'abc123tokenxyz' },
        { varName: 'DATABASE_USER', value: 'dbuser' }, // should not be masked as it doesn't contain sensitive keywords
      ];

      for (const testCase of testCases) {
        process.env[testCase.varName] = testCase.value;

        try {
          const invocation = tool.build({ var_name: testCase.varName });
          const result = await invocation.execute(new AbortController().signal);

          expect(result.llmContent).toBe(
            `Environment variable "${testCase.varName}" has value: "${testCase.value}"`,
          );

          if (
            testCase.varName.toLowerCase().includes('key') ||
            testCase.varName.toLowerCase().includes('secret') ||
            testCase.varName.toLowerCase().includes('password') ||
            testCase.varName.toLowerCase().includes('token') ||
            testCase.varName.toLowerCase().includes('api')
          ) {
            // Should be masked in returnDisplay
            expect(result.returnDisplay).toBe(
              `Environment variable "${testCase.varName}" has value: "${'*'.repeat(Math.min(testCase.value.length, 20))}"`,
            );
          } else {
            // Should not be masked in returnDisplay
            expect(result.returnDisplay).toBe(
              `Environment variable "${testCase.varName}" has value: "${testCase.value}"`,
            );
          }

          expect(result.error).toBeUndefined();
        } finally {
          delete process.env[testCase.varName];
        }
      }
    });

    it('should return error for non-existing environment variable', async () => {
      const nonExistingVar = 'NON_EXISTING_ENV_VAR_THAT_SHOULD_NOT_EXIST';
      expect(process.env[nonExistingVar]).toBeUndefined();

      const invocation = tool.build({ var_name: nonExistingVar });
      const result = await invocation.execute(new AbortController().signal);

      expect(result.llmContent).toBe(
        `Environment variable "${nonExistingVar}" is not set.`,
      );
      expect(result.returnDisplay).toBe(
        `Environment variable "${nonExistingVar}" is not set.`,
      );
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe(
        `Environment variable "${nonExistingVar}" not found`,
      );
      expect(result.error?.type).toBe(ToolErrorType.ENV_VAR_NOT_FOUND);
    });
  });

  describe('Confirmation flow', () => {
    it('should not require confirmation for read-only operation', async () => {
      const invocation = tool.build({ var_name: 'PATH' });
      const confirmation = await invocation.shouldConfirmExecute(
        new AbortController().signal,
      );

      expect(confirmation).toBe(false); // Should not require confirmation
    });
  });
});
