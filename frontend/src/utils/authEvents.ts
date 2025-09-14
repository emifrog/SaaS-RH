import { store } from '@/store';
import { refreshAccessToken } from '@/store/slices/authSlice';

const setupAuthEventListeners = () => {
  // Handle unauthorized requests (401)
  window.addEventListener('unauthorized', async () => {
    try {
      await store.dispatch(refreshAccessToken());
      // The interceptor will retry the original request automatically
      // since we're not rejecting the promise here
    } catch (error) {
      window.dispatchEvent(new Event('logout'));
    }
  });

  // Handle logout
  window.addEventListener('logout', () => {
    store.dispatch({ type: 'auth/logout/fulfilled' });
    window.location.href = '/login';
  });
};

export default setupAuthEventListeners;
