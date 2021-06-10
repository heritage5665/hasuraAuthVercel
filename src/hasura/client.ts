import axios, { AxiosInstance, AxiosResponse } from "axios";
// import HasuraHeader from "./types/User"

declare module 'axios' {
    interface AxiosResponse<T = any> extends Promise<T> {
    }
}

export default abstract class HasuraHttpClient {
    protected readonly instance: AxiosInstance;

    constructor() {

        this.instance = axios.create(
            {
                baseURL: 'https://convey-core.herokuapp.com/v1/graphql',
                headers: {
                    "X-Hasura-Admin-Secret": "uAi8w7bI0h40Dmgxl2PvOooaEI1DeNoPtdYn93TjgmJKraHjT3aseuQHOy3aZGCv"
                }
            }
        )
        this._initializeResponseInterceptor();
    }

    private _initializeResponseInterceptor = () => {
        this.instance.interceptors.response.use(
            this._handleResponse,
            this._handleError,
        )
    }

    private _handleResponse = ({ data }: AxiosResponse) => {
        let response: any = data
        if (response.errors) {
            return Promise.reject(response.errors)
        }
        return response.data
    }

    private _handleError = (error: any) => Promise.reject(error)
    public runQuuery = (query: string, variables: object) => this.instance.post("", {
        "variables": variables,
        "query": query
    });
}

