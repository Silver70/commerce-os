import { queryOptions } from '@tanstack/react-query'
import { getMeServerFn } from '~/server/auth'

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'me'],
    queryFn: () => getMeServerFn(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
