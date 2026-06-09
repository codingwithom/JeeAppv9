import { Router } from 'express';
import { smartSearch, proxyThumbnail } from './smartSearchController';

const router = Router();

// Route: /api/media/smart-search
router.get('/smart-search', smartSearch);

// Route: /api/media/proxy-thumbnail
router.get('/proxy-thumbnail', proxyThumbnail);

export default router;