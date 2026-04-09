/**
 * Copied from https://github.com/tctree333/js-yaml-source-map/blob/main/src/index.ts
 */
import type {EventType, State} from 'js-yaml';

interface PathMap {
  [path: string]: {
    line: number;
    position: number;
    lineStart: number;
  };
}

interface SourceLocation {
  line: number;
  column: number;
  position: number;
}

interface SourceMapFragment {
  path: string;
  line: number;
  position: number;
  lineStart: number;
  children?: SourceMapFragment[];
}

interface YamlState {
  result?: unknown;
  kind?: 'scalar' | 'mapping' | 'sequence';
  line: number;
  position: number;
  lineStart: number;
}

export default class SourceMap {
  private _map: PathMap;
  private _path: string[];
  private _lastScalar: string;
  private _fragments: SourceMapFragment[];
  private _count: number;

  public constructor() {
    this._map = {};
    this._path = [];
    this._lastScalar = '';
    this._fragments = [];
    this._count = 0;
  }

  public get map(): PathMap {
    return this._map;
  }

  private resolveNode(fragment: SourceMapFragment, pathName: string): void {
    if (fragment.path === '.') {
      pathName = '.';
    }

    if (!this._map[pathName]) {
      const {line, position, lineStart} = fragment;
      this._map[pathName] = {line, position, lineStart};
    }

    if (fragment.children && fragment.children.length > 0) {
      fragment.children.forEach((child) => {
        this.resolveNode(child, (pathName === '.' ? '' : pathName) + '.' + child.path);
      });
    }
  }

  private iterFragments(pathName: string, callback: (fragment: SourceMapFragment) => void): void {
    for (let i = this._fragments.length - 1; i >= 0; i--) {
      if (!this._fragments[i].path.startsWith(pathName) || this._fragments[i].path === pathName) {
        continue;
      }
      const fragment = this._fragments.pop();
      if (fragment) {
        callback(fragment);
      }
    }
  }

  private handleState(event: 'open' | 'close', state: YamlState): void {
    if (event === 'close') {
      const result = state.result;
      const kind = state.kind;
      const pathName = this._path.join('.');

      if (kind === 'scalar') {
        this._path.pop();

        const scalarValue = String(result);
        this._lastScalar = scalarValue;
        const {line, position, lineStart} = state;
        if (this._path.length === 0) {
          this._map['.' + scalarValue] = {
            line,
            position,
            lineStart
          };
        } else {
          this._fragments.push({
            path: this._path.join('.') + '.' + scalarValue,
            line,
            position,
            lineStart
          });
        }
      } else if (kind === 'mapping') {
        const newFragment: SourceMapFragment = {
          path: pathName,
          children: [],
          line: 0,
          position: 0,
          lineStart: 0
        };

        let index = 0;
        this.iterFragments(pathName, (fragment) => {
          index++;
          if (!fragment.children || fragment.children.length === 0) {
            if (index % 2 === 1) {
              return;
            }
          }
          if (this._path.length === 1) {
            this.resolveNode(fragment, fragment.path);
          } else {
            newFragment.children!.push({
              ...fragment,
              path: fragment.path.slice(pathName.length + 1)
            });
            newFragment.line = fragment.line;
            newFragment.position = fragment.position;
            newFragment.lineStart = fragment.lineStart;
          }
        });

        if (newFragment.children && newFragment.children.length > 0) {
          this._fragments.push(newFragment);
        }
        this._path.pop();
      } else if (kind === 'sequence') {
        const newFragment: SourceMapFragment = {
          path: pathName,
          children: [],
          line: 0,
          position: 0,
          lineStart: 0
        };

        const seen = new Set<number>();
        let index = Array.isArray(result) ? result.length : 0;
        this.iterFragments(pathName, (fragment) => {
          if (seen.has(fragment.position)) {
            return;
          }
          index--;
          seen.add(fragment.position);
          if (this._path.length === 1) {
            this.resolveNode(fragment, `${pathName}.${index}`);
          } else {
            newFragment.children!.push({
              ...fragment,
              path: index.toString()
            });
            newFragment.line = fragment.line;
            newFragment.position = fragment.position;
            newFragment.lineStart = fragment.lineStart;
          }
        });
        if (newFragment.children && newFragment.children.length > 0) {
          this._fragments.push(newFragment);
        }
        this._path.pop();
      } else {
        this._path.pop();
      }
    }

    if (event === 'open') {
      if (this._count === 0) {
        const {line, position, lineStart} = state;
        this._map['.'] = {line, position, lineStart};
      }
      this._path.push(this._lastScalar);
      this._count++;
    }
  }

  public listen(): (this: State, eventType: EventType, state: State) => void {
    return this.handleState.bind(this) as unknown as (this: State, eventType: EventType, state: State) => void;
  }

  public lookup(pathName: string | string[]): SourceLocation | undefined {
    let lookupPath = pathName instanceof Array ? pathName.map((f) => `${f}`).join('.') : `${pathName}`;
    if (!lookupPath.startsWith('.')) {
      lookupPath = '.' + lookupPath;
    }
    if (lookupPath.startsWith('..')) {
      lookupPath = lookupPath.slice(1);
    }
    lookupPath = lookupPath.replace(/\[/g, '.').replace(/\]/g, '');
    const pathInfo = this._map[lookupPath];
    if (!pathInfo) {
      return;
    }
    return {
      line: pathInfo.line + 1,
      column: pathInfo.position - pathInfo.lineStart + 1,
      position: pathInfo.position
    };
  }
}

export type {PathMap, SourceLocation};
