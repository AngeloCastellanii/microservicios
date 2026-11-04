import type {
  CreateNotificationRequest,
  DeleteByRelatedItemRequest,
  DeleteByRelatedItemResponse,
  DismissRequest,
  GetNotificationRequest,
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkReadRequest,
  Notification,
} from "@studyy/proto";
import type * as grpc from "@grpc/grpc-js";
import * as domain from "./domain/index.js";

type Call<T> = grpc.ServerUnaryCall<T, unknown>;

export const notificationHandlers = {
  async CreateNotification(
    call: Call<CreateNotificationRequest>,
  ): Promise<Notification> {
    return domain.createNotification(call.request);
  },

  async ListNotifications(
    call: Call<ListNotificationsRequest>,
  ): Promise<ListNotificationsResponse> {
    return {
      notifications: await domain.listNotifications(call.request),
    };
  },

  async MarkRead(call: Call<MarkReadRequest>): Promise<Notification> {
    return domain.markRead(call.request.id);
  },

  async Dismiss(call: Call<DismissRequest>): Promise<Notification> {
    return domain.dismiss(call.request.id);
  },

  async GetNotification(
    call: Call<GetNotificationRequest>,
  ): Promise<Notification> {
    return domain.getNotification(call.request.id);
  },

  async DeleteByRelatedItem(
    call: Call<DeleteByRelatedItemRequest>,
  ): Promise<DeleteByRelatedItemResponse> {
    const deleted = await domain.deleteByRelatedItem(
      call.request.relatedItemId,
    );
    return { deleted };
  },
};
