/**
 * @fileoverview Production-grade implementation of TICKET-003 using Compound Components pattern
 * @module ticket-003
 * @requires React 18+
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
  useRef,
  memo,
  forwardRef,
  ReactNode,
  ComponentPropsWithRef,
  ForwardedRef,
} from 'react';

// Types and Interfaces
interface TicketState {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data: Record<string, unknown>;
  error: Error | null;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}

interface TicketContextValue {
  state: TicketState;
  dispatch: React.Dispatch<TicketAction>;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

interface TicketProviderProps {
  children: ReactNode;
  initialState?: Partial<TicketState>;
  onStateChange?: (state: TicketState) => void;
  errorBoundary?: (error: Error) => ReactNode;
}

interface RenderPropArgs {
  state: TicketState;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  updateData: (data: Partial<TicketState['data']>) => void;
}

type TicketAction =
  | { type: 'SET_STATUS'; payload: TicketState['status'] }
  | { type: 'UPDATE_DATA'; payload: Partial<TicketState['data']> }
  | { type: 'SET_ERROR'; payload: Error }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INCREMENT_VERSION' }
  | { type: 'RESET'; payload?: Partial<TicketState> };

// Error Classes
class TicketError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'TicketError';
  }
}

// Context
const TicketContext = createContext<TicketContextValue | undefined>(undefined);
TicketContext.displayName = 'TicketContext';

// Custom Hooks
const useTicketContext = (): TicketContextValue => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new TicketError(
      'useTicketContext must be used within a TicketProvider',
      'CONTEXT_ERROR'
    );
  }
  return context;
};

// Reducer
const ticketReducer = (state: TicketState, action: TicketAction): TicketState => {
  switch (action.type) {
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
        metadata: {
          ...state.metadata,
          updatedAt: new Date(),
        },
      };

    case 'UPDATE_DATA':
      return {
        ...state,
        data: { ...state.data, ...action.payload },
        metadata: {
          ...state.metadata,
          updatedAt: new Date(),
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload,
        metadata: {
          ...state.metadata,
          updatedAt: new Date(),
        },
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        status: state.error ? 'pending' : state.status,
      };

    case 'INCREMENT_VERSION':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          version: state.metadata.version + 1,
          updatedAt: new Date(),
        },
      };

    case 'RESET':
      return {
        ...getInitialState(),
        ...action.payload,
      };

    default:
      return state;
  }
};

// Utilities
const getInitialState = (overrides?: Partial<TicketState>): TicketState => ({
  id: crypto.randomUUID(),
  status: 'pending',
  data: {},
  error: null,
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  },
  ...overrides,
});

// Main Compound Component
export const Ticket = memo(({ children, ...props }: TicketProviderProps) => {
  const [state, dispatch] = useReducer(
    ticketReducer,
    getInitialState(props.initialState)
  );

  const