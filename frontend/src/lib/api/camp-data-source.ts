import { usesBackendApi } from './config'
import { campBackendApi } from './camp-backend'
import { campApi } from '../mock-api/camp'

/** Single entry point for Camp data — mock (demo) or live API. */
export const campDataSource = usesBackendApi ? campBackendApi : campApi

export type CampDataSource = typeof campDataSource
