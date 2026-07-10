import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Hooks tipados — usar siempre estos en lugar de useDispatch/useSelector directos
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
