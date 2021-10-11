import axios from "axios";
import { HASURA_GRAPHQL_ENGINE_BASE_URL, HASURA_ADMIN_SECRET } from "../config/settings.js";
class HttpClient {
    constructor(option) {
        this._initializeResponseInterceptor = () => {
            this.instance.interceptors.response.use(this._handleResponse, this._handleError);
        };
        this._handleResponse = ({ data }) => {
            let response = data;
            if (response.errors) {
                return Promise.reject(response.errors);
            }
            return response.data;
        };
        this._handleError = (error) => Promise.reject(error);
        this.instance = axios.create(option);
        this._initializeResponseInterceptor();
    }
}
export default class HasuraHttpClient extends HttpClient {
    constructor() {
        super({
            baseURL: HASURA_GRAPHQL_ENGINE_BASE_URL,
            headers: {
                "X-Hasura-Admin-Secret": HASURA_ADMIN_SECRET,
                // "Content-Type": "multipart/form-data"
            }
        });
        this.execute = (query, variables) => this.instance.post("", {
            "variables": variables,
            "query": query
        });
    }
}
export class UploadHttpClient extends HttpClient {
    constructor() {
        super({
            baseURL: 'https://agile-falls-17062.herokuapp.com/upload',
            headers: {
                'Content-Type': "multipart/form-data;",
                // "X-Hasura-Admin-Secret": "uAi8w7bI0h40Dmgxl2PvOooaEI1DeNoPtdYn93TjgmJKraHjT3aseuQHOy3aZGCv"
            }
        });
    }
    upload(file_type, file) {
        return this.instance.post('/' + file_type, {
            media: file
        });
    }
}
