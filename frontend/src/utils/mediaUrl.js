const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const DEFAULT_FOOD_IMAGE = 'https://openclipart.org/image/800px/289282';

export const resolveMediaUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

export const hasRealImage = (path) => Boolean(path) && path !== DEFAULT_FOOD_IMAGE;

export default resolveMediaUrl;
