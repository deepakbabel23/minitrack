interface Props {
  // 'create' powers /tasks/new; 'edit' powers /tasks/:taskId/edit. One
  // component serves both because the form is identical — only how it loads and
  // saves differs. Built out in the create and edit slices.
  mode: 'create' | 'edit'
}

export default function TaskFormPage({ mode }: Props) {
  return <h1>{mode === 'create' ? 'New task' : 'Edit task'}</h1>
}
