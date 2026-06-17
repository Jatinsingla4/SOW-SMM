import { trpc } from '@/lib/trpc';

export type UserRole = 'OWNER' | 'GROUP_HEAD' | 'ACCOUNT_MANAGER' | 'SOCIAL_MEDIA_EXECUTIVE' | 'MOTION_DESIGNER' | 'STATIC_DESIGNER' | 'CLIENT';

export const userService = {
    getMe: () => trpc.users.getMe.query(),
    
    list: () => trpc.users.list.query(),
    
    listPending: () => trpc.users.listPending.query(),

    approveUser: (userId: number, role: UserRole, clientId?: number) =>
        trpc.users.approveUser.mutate({ userId, role: role as any, clientId }),

    updateRole: (userId: number, role: UserRole, clientId?: number) =>
        trpc.users.updateRole.mutate({ userId, role: role as any, clientId }),
        
    assignBrand: (userId: number, brandId: number) =>
        trpc.users.assignBrand.mutate({ userId, brandId }),
        
    removeBrand: (userId: number, brandId: number) =>
        trpc.users.removeBrand.mutate({ userId, brandId }),
        
    getUserBrands: (userId: number) =>
        trpc.users.getUserBrands.query({ userId }),
        
    listByRole: (role: UserRole) =>
        trpc.users.listByRole.query({ role }),
        
    deleteUser: (userId: number) =>
        trpc.users.delete.mutate({ userId }),
};
