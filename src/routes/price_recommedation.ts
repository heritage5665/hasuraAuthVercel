import express, { Response } from "express";
import { check, CustomValidator } from "express-validator";
import { validateInput } from "../config/user.service.js";

import { verifyToken } from '../utils/validate-token.js';

const price_router = express.Router();
type priceRange = {
    low: number
    high: number
}
type latitude = number
type longitude = number

type Coordinate = {
    longitude: latitude
    latitude: longitude
}

const isValidCoordinate: CustomValidator = (cord: Coordinate) => {
    const isLatitude = (num: number) => isFinite(num) && Math.abs(num) <= 90;
    const isLongitude = (num: number) => isFinite(num) && Math.abs(num) <= 180;
    if (!isLatitude(cord.latitude) && !isLongitude(cord.longitude)) {
        return Promise.reject("invalid ccordinated given");
    }
}

const validateLocation = [
    check("start").custom(isValidCoordinate),
    check("end").custom(isValidCoordinate)
]

const getPriceRange = (): priceRange => {
    return {
        low: 40,
        high: 200
    }
}
const COORD_FACTOR = 1e7;

const calculateRateRange = (totalDistance: number, priceRange: priceRange) => {
    return {
        minimum: priceRange.low * totalDistance,
        maximum: priceRange.high * totalDistance
    }
}
const getApproxTravelDistance = (start: Coordinate, end: Coordinate) => {
    function toRadians(num: number) {
        return num * Math.PI / 180;
    }
    const R = 6371000;  // earth radius in metres
    const lat1 = toRadians(start.latitude / COORD_FACTOR);
    const lat2 = toRadians(end.latitude / COORD_FACTOR);
    const lon1 = toRadians(start.longitude / COORD_FACTOR);
    const lon2 = toRadians(end.longitude / COORD_FACTOR);

    const changeInLatitude = lat2 - lat1;
    const changeInLogitude = lon2 - lon1;
    // const a = Math.pow(Math.sin(changeInLatitude / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(changeInLogitude / 2), 2)
    const a = Math.sin(changeInLatitude / 2) * Math.sin(changeInLatitude / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(changeInLogitude / 2) * Math.sin(changeInLogitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
    // return 2;
}

price_router.post("/range", validateLocation, validateInput,
    verifyToken, async (req: any, res: Response) => {
        const { start, end } = req.body
        const totalRouteDistance = getApproxTravelDistance(start, end)
        // This should be query from the db

        const ratePerDistanceRate = calculateRateRange(totalRouteDistance, getPriceRange())
        return res.status(200).json({
            data: {
                ...ratePerDistanceRate
            },
            "status": "true"
        })
    })

// module.exports = price_router;
export default price_router