import express, { Request, Response } from "express";
// import { check, CustomValidator } from "express-validator";
import { validateInput } from "../config/user.service.js";
import { verifyToken } from '../utils/validate-token.js';

const price_router = express.Router();

type priceRange = {
    min: number
    max: number
}
type latitude = number
type longitude = number

type Coordinate = {
    longitude: latitude
    latitude: longitude
}

const isValidCoordinate = (cord: Coordinate) => {
    const isLatitude = (num: number) => isFinite(num) && Math.abs(num) <= 90;
    const isLongitude = (num: number) => isFinite(num) && Math.abs(num) <= 180;
    if (!isLatitude(cord.latitude) || !isLongitude(cord.longitude)) {
        return Promise.reject("invalid ccordinated given");
    }
    return true

}

// const validateLocation = [
//     check("start").notEmpty().custom(isValidCoordinate),
//     check("end").notEmpty().custom(isValidCoordinate)
// ]




const calculateRateRange = (req: Request): priceRange => {
    const { start, end } = req.body
    const km_to_sqm_multiplier = 1000000
    const avg_car_speed = 13 * 1.60934
    const distance = getApproxTravelDistance(start, end)
    const distance_in_sqm = distance * km_to_sqm_multiplier
    const avg_time_taken = distance / avg_car_speed

    const company_rate = {
        base_price: 300,
        price_per_km: 1.5,
        price_per_seconds: 0.001,
        package_size: 0.1
    }

    const price = [
        company_rate.base_price * distance, company_rate.price_per_km * distance,
        company_rate.price_per_seconds * avg_time_taken, company_rate.package_size * distance_in_sqm
    ]

    return {
        min: Math.min(...price),
        max: Math.max(...price)
    }

}

//calculate the distance between to gps cordinate using haversine formula
const getApproxTravelDistance = (start: Coordinate, end: Coordinate) => {
    function toRadians(num: number) {
        return num * Math.PI / 180;
    }
    const COORD_FACTOR = 1e7;
    const R = 6371000;  // earth radius in metres
    const lat1 = toRadians(start.latitude / COORD_FACTOR);
    const lat2 = toRadians(end.latitude / COORD_FACTOR);
    const lon1 = toRadians(start.longitude / COORD_FACTOR);
    const lon2 = toRadians(end.longitude / COORD_FACTOR);

    const changeInLatitude = lat2 - lat1;
    const changeInLogitude = lon2 - lon1;
    const avg_change_in_lat = changeInLatitude / 2
    const avg_change_in_log = changeInLogitude / 2
    const a = Math.pow(Math.sin(avg_change_in_lat), 2) + (Math.cos(lat1) * Math.cos(lat2)) * Math.pow(Math.sin(avg_change_in_log), 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c) / 1000;

}

async function validateCordinates(start: Coordinate, end: Coordinate) {
    const is_valid = await isValidCoordinate(start) && await isValidCoordinate(end)
    if (is_valid) {
        return Promise.reject({
            errors: [
                {
                    "value": [start, end],
                    "msg": "coordinates given is invalid",
                    "param": ["start", "end"],
                    "location": "body"
                }

            ]
        })
    }


}


price_router.post("/range", verifyToken, async (req: any, res: Response) => {
    try {
        const ratePerDistanceRate = calculateRateRange(req)
        const { start, end } = req.body
        await validateCordinates(start, end)
        return res.status(200).json({
            data: {
                ...ratePerDistanceRate
            },
            "status": "true"
        })
    } catch (error) {
        return res.json(error).status(400)
    }
})

// module.exports = price_router;
export default price_router
