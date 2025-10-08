import BaseUrl from "../models/base_url.model.js";

export const createBaseUrl = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ message: 'URL is required' });
        }

        const baseUrl = new BaseUrl({ url });
        await baseUrl.save();
        return res.status(201).json(baseUrl);
    } catch (error) {
        console.error('Error creating base URL:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const getBaseUrl = async (req, res) => {
    try {
        const baseUrl = await BaseUrl.findOne();
        if (!baseUrl) {
            return res.status(404).json({ message: 'Base URL not found' });
        }
        return res.status(200).json(baseUrl);
    } catch (error) {
        console.error('Error fetching base URL:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
