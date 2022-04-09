var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import { verifyToken } from '../utils/validate-token.js';
const price_router = express.Router();
const isValidCoordinate = (cord) => {
    const isLatitude = (num) => isFinite(num) && Math.abs(num) <= 90;
    const isLongitude = (num) => isFinite(num) && Math.abs(num) <= 180;
    if (isLatitude(cord.latitude) && isLongitude(cord.longitude)) {
        return true;
    }
    return false;
};
// const validateLocation = [
//     check("start").notEmpty().custom(isValidCoordinate),
//     check("end").notEmpty().custom(isValidCoordinate)
// ]
const calculateRateRange = (req) => {
    const { start, end } = req.body;
    const km_to_sqm_multiplier = 1000000;
    const avg_car_speed = 13 * 1.60934;
    const distance = getApproxTravelDistance(start, end);
    const distance_in_sqm = distance * km_to_sqm_multiplier;
    const avg_time_taken = distance / avg_car_speed;
    const company_rate = {
        base_price: 300,
        price_per_km: 150,
        price_per_seconds: 100,
        package_size: 90
    };
    const price = [
        company_rate.base_price * distance, company_rate.price_per_km * distance,
        company_rate.price_per_seconds * avg_time_taken, company_rate.package_size * distance_in_sqm
    ];
    return {
        min: Math.min(...price),
        max: Math.max(...price)
    };
};
//calculate the distance between to gps cordinate using haversine formula
const getApproxTravelDistance = (start, end) => {
    function toRadians(num) {
        return num * Math.PI / 180;
    }
    const COORD_FACTOR = 1e7;
    const R = 6371000; // earth radius in metres
    const lat1 = toRadians(start.latitude / COORD_FACTOR);
    const lat2 = toRadians(end.latitude / COORD_FACTOR);
    const lon1 = toRadians(start.longitude / COORD_FACTOR);
    const lon2 = toRadians(end.longitude / COORD_FACTOR);
    const changeInLatitude = lat2 - lat1;
    const changeInLogitude = lon2 - lon1;
    const avg_change_in_lat = changeInLatitude / 2;
    const avg_change_in_log = changeInLogitude / 2;
    const a = Math.pow(Math.sin(avg_change_in_lat), 2) + (Math.cos(lat1) * Math.cos(lat2)) * Math.pow(Math.sin(avg_change_in_log), 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c) / 1000;
};
function validateCordinates(start, end) {
    return __awaiter(this, void 0, void 0, function* () {
        const is_valid = isValidCoordinate(start) && isValidCoordinate(end);
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
            });
        }
    });
}
price_router.post("/range", verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ratePerDistanceRate = calculateRateRange(req);
        const { start, end } = req.body;
        // await validateCordinates(start, end)
        return res.status(200).json({
            data: Object.assign({}, ratePerDistanceRate),
            "status": "true"
        });
    }
    catch (error) {
        return res.json(error).status(400);
    }
}));
// module.exports = price_router;
export default price_router;
