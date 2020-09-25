import {
  useAddTodoMutationMutation,
  AddTodoInput,
  TodoApp_UserFragment,
  AddTodoMutationMutation,
  TodoList_UserFragmentDoc,
  TodoList_UserFragment,
} from "../generated-types";
import * as Option from "../Option";
import { FetchResult } from "apollo-link";
import { useCallback } from "react";
import { MutationUpdaterFn } from "apollo-client";

let tempID = 0;

const createOptimisticResponse = (
  text: string,
  user: TodoApp_UserFragment
): AddTodoMutationMutation => {
  return {
    __typename: "Mutation",
    addTodo: {
      __typename: "AddTodoPayload",
      todoEdge: {
        __typename: "TodoEdge",
        cursor: "client:newTodoEdge:" + tempID++,
        node: {
          __typename: "Todo",
          id: "client:newTodo:" + tempID++,
          text,
          complete: false,
        },
      },
      user: {
        __typename: "User",
        id: user.id,
        totalCount: user.totalCount,
      },
    },
  };
};

const update: MutationUpdaterFn<AddTodoMutationMutation> = (proxy, result) => {
  const userId = result?.data?.addTodo?.user.id;
  if (Option.isNone(userId)) {
    return;
  }
  const data = proxy.readFragment<TodoList_UserFragment>({
    fragment: TodoList_UserFragmentDoc,
    fragmentName: "TodoList_user",
    id: `User:${userId}`,
  });
  if (Option.isNone(data)) {
    return;
  }
  const edges = data.todos?.edges;
  const addTodo = result?.data?.addTodo;
  if (Option.isNone(edges) || Option.isNone(addTodo)) {
    return;
  }
  edges.push(addTodo.todoEdge);
  proxy.writeFragment<TodoList_UserFragment>({
    fragment: TodoList_UserFragmentDoc,
    fragmentName: "TodoList_user",
    id: `User:${userId}`,
    data,
  });
};

type AddTodoMutationFetchResult = FetchResult<
  AddTodoMutationMutation,
  Record<string, any>,
  Record<string, any>
>;

export const useAddTodoMutation = () => {
  const [mutate] = useAddTodoMutationMutation();

  return useCallback(
    (text: string, user: TodoApp_UserFragment) => {
      const input: AddTodoInput = {
        text,
        userId: user.userId,
        clientMutationId: `${tempID++}`,
      };

      return mutate({
        variables: { input },
        optimisticResponse: createOptimisticResponse(text, user),
        update,
      });
    },
    [mutate]
  );
};
