export interface SourceSchema {
  name: string;
  description: string;
  display_name: string;
  fields: SourceSchemaField[];
  custom_types?: SourceSchemaCustomType[];
  /**
   * Optional declaration that this source emits localized items. When present,
   * downstream sync configurations may filter incoming items by locale.
   *
   * `supported_locales` entries are BCP 47 tags. Validated by the bespoke
   * source-schema validator at app build/validation time using the
   * `language-tags` IANA registry check.
   */
  locale_config?: SourceSchemaLocaleConfig;
}

export interface SourceSchemaLocaleConfig {
  supported_locales: string[];
}

export interface SourceSchemaField {
  name: string;
  display_name: string;
  description: string;
  /**
   * Field type - can be a primitive type, custom type reference, or array syntax
   * @pattern ^(string|integer|boolean|decimal|\w+|\[\w+\])$
   */
  type: string;
  primary?: boolean;
  format?: 'url';
}

export interface SourceSchemaObjects {
  [file: string]: SourceSchema;
}

export interface SourceSchemaCustomType {
  name: string;
  display_name: string;
  description: string;
  fields: SourceSchemaField[];
}
