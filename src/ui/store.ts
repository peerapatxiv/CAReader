import type { Service } from '../core/types';
import { emptyQuery, type Query, type Sort, type SortKey } from '../core/query';

export type Tab = 'overview' | 'services';
export type Theme = 'light' | 'dark' | 'system';
export type FacetKey = 'methods' | 'hosts' | 'folders' | 'includes' | 'scopes' | 'assertions' | 'generated' | 'urlIssues';

export interface State {
  services: Service[];
  fileName?: string;
  query: Query;
  sort: Sort;
  selectedId?: string;
  tab: Tab;
  theme: Theme;
}

export type Action =
  | { type: 'loaded'; services: Service[]; fileName: string }
  | { type: 'setQuery'; query: Partial<Query> }
  | { type: 'toggleFacet'; facet: FacetKey; value: string }
  | { type: 'drill'; query: Partial<Query> }
  | { type: 'setSort'; key: SortKey }
  | { type: 'select'; id?: string }
  | { type: 'setTab'; tab: Tab }
  | { type: 'setTheme'; theme: Theme }
  | { type: 'reset' };

export const initialState: State = {
  services: [],
  query: emptyQuery,
  sort: { key: 'name', dir: 'asc' },
  tab: 'overview',
  theme: 'system',
};

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'loaded':
      return { ...s, services: a.services, fileName: a.fileName, tab: 'overview', selectedId: undefined };
    case 'setQuery':
      return { ...s, query: { ...s.query, ...a.query } };
    case 'toggleFacet': {
      const cur = s.query[a.facet];
      const next = cur.includes(a.value) ? cur.filter((v) => v !== a.value) : [...cur, a.value];
      return { ...s, query: { ...s.query, [a.facet]: next } };
    }
    case 'drill':
      return { ...s, query: { ...emptyQuery, ...a.query }, tab: 'services', selectedId: undefined };
    case 'setSort':
      return {
        ...s,
        sort: s.sort.key === a.key ? { key: a.key, dir: s.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: a.key, dir: 'asc' },
      };
    case 'select':
      return { ...s, selectedId: a.id };
    case 'setTab':
      return { ...s, tab: a.tab };
    case 'setTheme':
      return { ...s, theme: a.theme };
    case 'reset':
      return { ...initialState, theme: s.theme };
  }
}
