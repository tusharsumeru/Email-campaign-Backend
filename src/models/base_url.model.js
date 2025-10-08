import mongoose from 'mongoose';

const baseUrlSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    }

}, {
    timestamps: true,
    versionKey: false,
});

const BaseUrl = mongoose.model('BaseUrl', baseUrlSchema);
export default BaseUrl;
