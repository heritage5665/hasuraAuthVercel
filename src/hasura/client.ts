import axios, { AxiosInstance, AxiosResponse } from "axios";
import HasuraHeader from "./types/User"

declare module 'axios' {
    interface AxiosResponse<T = any> extends Promise<T> {
    }
}

export default abstract class HttpClient {
    protected readonly instance: AxiosInstance;

    constructor(baseURL: string, headers: object) {
        this.instance = axios.create(
            {
                baseURL: baseURL,
                headers: headers
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

    private _handleResponse = ({ data }: AxiosResponse) => data
    private _handleError = (error: any) => Promise.reject(error)
    public runQuuery = (query: string, variables: object) => this.instance.post("", {
        "variables": variables,
        "query": query
    });
}

