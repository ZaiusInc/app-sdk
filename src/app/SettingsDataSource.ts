/* eslint-disable max-classes-per-file */
import {Schema} from '@zaiusinc/app-forms-schema';

export interface SettingsDataSourceRequest {
  /** The settings form section of the field asking for options */
  section: string;
  /** The field asking for options */
  field: string;
  /** The section's current values, including the user's unsaved edits */
  formData: Schema.FormSectionData;
}

/**
 * Provides the options of a settings form `select` or `multi_select` field declared with
 * `dataSource: {type: app, entry_point: <name>}`. `src/settings/<entry_point>` exports a subclass named after the
 * entry point, or a default {@link SettingsDataSourceFunction} instead.
 */
export abstract class SettingsDataSource {
  /**
   * Returns the field's options. Throw a {@link SettingsOptionsError} to show the user a message instead.
   */
  public abstract getOptions(request: SettingsDataSourceRequest): Promise<Schema.SelectOption[]>;
}

/**
 * A settings data source as a function: the default export of `src/settings/<entry_point>`.
 * Throw a {@link SettingsOptionsError} to show the user a message instead of options.
 */
export type SettingsDataSourceFunction = (request: SettingsDataSourceRequest) => Promise<Schema.SelectOption[]>;

/**
 * A message for the user, shown in the settings form instead of options, e.g. "Select a workspace first".
 * Any other error is reported to the user as a generic failure.
 */
export class SettingsOptionsError extends Error {}
