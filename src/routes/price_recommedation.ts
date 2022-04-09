import express, { Request, Response } from "express";
// import { check, CustomValidator } from "express-validator";
// import { validateInput } from "../config/user.service.js";
import { verifyToken } from '../utils/validate-token.js';

const price_router = express.Router();

type priceRange = {
    distance: number
    min: number
    max: number,
    avg_time_taken: number
}
type latitude = number
type longitude = number

type Coordinate = {
    longitude: longitude
    latitude: latitude
}

const isValidCoordinate = (cord: Coordinate) => {
    const isLatitude = (num: number) => isFinite(num) && Math.abs(num) <= 90;
    const isLongitude = (num: number) => isFinite(num) && Math.abs(num) <= 180;
    if (isLatitude(cord.latitude) && isLongitude(cord.longitude)) {
        return true
    }

    return false

}


// JavaScript program to calculate Distance Between
// Two Points on Earth

function distance(lat1: number, lat2: number, lon1: number, lon2: number) {


    // Haversine formula
    let dlon = lon2 - lon1;
    let dlat = lat2 - lat1;
    let a = Math.pow(Math.sin(dlat / 2), 2)
        + Math.cos(lat1) * Math.cos(lat2)
        * Math.pow(Math.sin(dlon / 2), 2);

    let c = 2 * Math.asin(Math.sqrt(a));

    // Radius of earth in kilometers. Use 3956
    // for miles
    let r = 6371;

    // calculate the result
    return (c * r);
}





const calculateRateRange = (req: Request): priceRange => {
    const { start, end } = req.body
    const km_to_sqm_multiplier = 1000000
    const avg_car_speed = 13 * 1.60934
    const distance = getApproxTravelDistance(start, end)
    const distance_in_sqm = distance * km_to_sqm_multiplier
    const avg_time_taken = distance / avg_car_speed

    const company_rate = {
        base_price: 300,
        price_per_km: 150,
        price_per_seconds: 100,
        package_size: 90
    }

    const price = [
        company_rate.base_price * distance, company_rate.price_per_km * distance,
        company_rate.price_per_seconds * avg_time_taken, company_rate.package_size * distance_in_sqm
    ]

    return {
        distance,
        min: Math.min(...price),
        max: Math.max(...price),
        avg_time_taken
    }

}

//calculate the distance between to gps cordinate using haversine formula
const getApproxTravelDistance = (start: Coordinate, end: Coordinate) => {
    function toRadians(num: number) {
        return num * Math.PI / 180;
    }
    const COORD_FACTOR = 1e7;
    // const R = 6371000;  // earth radius in metres
    const lat1 = toRadians(start.latitude);
    const lat2 = toRadians(end.latitude);
    const lon1 = toRadians(start.longitude);
    const lon2 = toRadians(end.longitude);
    // Haversine formula
    let dlon = lon2 - lon1;
    let dlat = lat2 - lat1;
    let a = Math.pow(Math.sin(dlat / 2), 2)
        + Math.cos(lat1) * Math.cos(lat2)
        * Math.pow(Math.sin(dlon / 2), 2);

    let c = 2 * Math.asin(Math.sqrt(a));

    // Radius of earth in kilometers. 
    let r = 6371;

    // calculate the result
    return (c * r);

}

async function validateCordinates(start: Coordinate, end: Coordinate) {
    const is_valid = isValidCoordinate(start) && isValidCoordinate(end)
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
        // await validateCordinates(start, end)
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
