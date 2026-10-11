import { Block } from '../models/Block.js';
import { HttpError } from './HttpError.js';

// Find one block by id, or stop the request with a 404.
export async function findBlock(id) {
  const block = await Block.findById(id).lean();
  if (!block) {
    throw new HttpError(404, 'Block not found');
  }
  return block;
}
