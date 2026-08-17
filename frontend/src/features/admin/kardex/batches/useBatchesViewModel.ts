import { useState } from 'react';
import { IBatchesViewModelState } from './BatchesModel';

export const useBatchesViewModel = () => {
    const [state] = useState<IBatchesViewModelState>({
        lotes: [],
        loading: false,
    });

    return {
        ...state,
    };
};
