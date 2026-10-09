import mongoose from 'mongoose';

export const CATEGORIES = ['mrt', 'hawker', 'park', 'supermarket', 'school']

const amenitySchema = new mongoose.Schema({
    category: {type: String,
        enum: CATEGORIES,
        required: true
    },
    name: String,
    location: {
        type: { type: String, enum:['Point'], required: true},
        coordinates: { type: [Number], required: true}
    }
})

amenitySchema.index ({ location: '2dsphere'});

export const Amenity = mongoose.model('Amenity', amenitySchema)