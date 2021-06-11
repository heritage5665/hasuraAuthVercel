import axios from "axios";
export default class HasuraHttpClient {
    constructor() {
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
        this.runQuuery = (query, variables) => this.instance.post("", {
            "variables": variables,
            "query": query
        });
        this.instance = axios.create({
            baseURL: 'https://convey-core.herokuapp.com/v1/graphql',
            headers: {
                "X-Hasura-Admin-Secret": "uAi8w7bI0h40Dmgxl2PvOooaEI1DeNoPtdYn93TjgmJKraHjT3aseuQHOy3aZGCv"
            }
        });
        this._initializeResponseInterceptor();
    }
}
