import { useState, useCallback } from 'react'
import { CheckSquare, Plus, Search, Pencil, Trash2, LayoutGrid, List } from 'lucide-react'
import axios from 'axios'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Topbar from '../components/Topbar'
import Drawer from '../components/ui/Drawer'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import ExportButtons from '../components/ExportButtons'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { exportTasksCSV, exportTasksPDF } from '../utils/exportUtils'

const today = () => new Date().toISOString().split('T')[0]

const COLUMNS = ['To Do', 'In Progress', 'Done', 'Cancelled']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return dateStr < today()
}

const COLUMN_META = {
  'To Do': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  'In Progress': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'Done': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  'Cancelled': { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
}

const EMPTY_FORM = {
  title: '', description: '', assigned_to: '', due_date: '',
  priority: 'Medium', status: 'To Do'
}

function TaskCard({ task, onEdit, onDelete, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-xl border border-[#E8ECF0] p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">{task.title}</p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onEdit(task) }}
            className="p-1 rounded text-blue-500 hover:bg-blue-50"
          >
            <Pencil size={12} />
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(task) }}
            className="p-1 rounded text-red-400 hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {task.description && (
        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge label={task.priority} dot={false} />
        <div className="flex items-center gap-1.5 text-xs">
          {task.assigned_to && (
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium">{task.assigned_to}</span>
          )}
          {task.due_date && (
            <span className={`font-medium ${isOverdue(task.due_date) ? 'text-red-500' : 'text-gray-400'}`}>
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({ column, tasks, onEdit, onDelete, activeId }) {
  const meta = COLUMN_META[column]

  return (
    <div className="flex flex-col min-w-[250px] flex-1">
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${meta.bg} border ${meta.border} mb-3`}>
        <span className={`font-heading font-bold text-sm ${meta.text}`}>{column}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${meta.text}`}>{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 min-h-[100px] p-1">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              isDragging={activeId === task.id}
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-300 font-medium">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function Tasks() {
  const toast = useToast()
  const { data: records, loading, refetch, setData } = useApi('/api/tasks')
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [view, setView] = useState('kanban')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [deletingSelected, setDeletingSelected] = useState(false)

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(r => r.id)))
  const handleDeleteSelected = async () => {
    if (!selected.size) return
    setDeletingSelected(true)
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/tasks/${id}`)))
      toast(`${selected.size} tasks deleted`)
      setSelected(new Set()); refetch()
    } catch { toast('Failed to delete some records', 'error') }
    finally { setDeletingSelected(false) }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const assignees = [...new Set(records.map(r => r.assigned_to).filter(Boolean))]

  const filtered = records.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchPriority = !filterPriority || r.priority === filterPriority
    const matchAssignee = !filterAssignee || r.assigned_to === filterAssignee
    return matchSearch && matchPriority && matchAssignee
  })

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setDrawerOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({
      title: r.title || '', description: r.description || '',
      assigned_to: r.assigned_to || '', due_date: r.due_date || '',
      priority: r.priority || 'Medium', status: r.status || 'To Do',
    })
    setErrors({}); setDrawerOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await axios.put(`/api/tasks/${editing.id}`, form)
        toast('Task updated')
      } else {
        await axios.post('/api/tasks', form)
        toast('Task created')
      }
      setDrawerOpen(false); refetch()
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await axios.delete(`/api/tasks/${confirm.id}`)
      toast('Task deleted'); setConfirm(null); refetch()
    } catch { toast('Failed to delete', 'error') }
    finally { setDeleting(false) }
  }

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: '' })) }

  // DnD handlers
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    // Find the task being dragged
    const draggedTask = records.find(t => t.id === active.id)
    if (!draggedTask) return

    // Determine new column: check if over.id is a task or a column
    let newStatus = null

    // Check if dropped on a column header (column names are the droppable IDs for empty columns)
    if (COLUMNS.includes(String(over.id))) {
      newStatus = String(over.id)
    } else {
      // Dropped on a task — use that task's column
      const overTask = records.find(t => t.id === over.id)
      if (overTask) newStatus = overTask.status
    }

    if (!newStatus || newStatus === draggedTask.status) return

    // Optimistic update
    setData(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: newStatus } : t))

    try {
      await axios.put(`/api/tasks/${draggedTask.id}`, { ...draggedTask, status: newStatus })
      toast(`Moved to "${newStatus}"`, 'info')
    } catch {
      toast('Failed to update', 'error')
      refetch()
    }
  }, [records, setData, refetch, toast])

  const activeTask = activeId ? records.find(t => t.id === activeId) : null

  return (
    <div className="min-h-screen">
      <Topbar title="Tasks" icon={CheckSquare} iconClass="text-red-500" breadcrumb="Tasks">
        <div className="flex items-center gap-2">
          <ExportButtons records={records} onCSV={exportTasksCSV} onPDF={exportTasksPDF} />
          <div className="flex items-center bg-white border border-[#E8ECF0] rounded-xl overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`p-2 ${view === 'kanban' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <List size={16} />
            </button>
          </div>
          <Button onClick={openAdd} size="sm" className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0">
            <Plus size={15} /> Add Task
          </Button>
        </div>
      </Topbar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search tasks..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm rounded-xl border border-[#E8ECF0] bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 w-48"
            />
          </div>
          <select
            value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-[#E8ECF0] bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-gray-600"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {assignees.length > 0 && (
            <select
              value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-[#E8ECF0] bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-gray-600"
            >
              <option value="">All Assignees</option>
              {assignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>

        {/* Kanban view */}
        {view === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUMNS.map(col => (
                <DroppableColumn
                  key={col}
                  column={col}
                  tasks={filtered.filter(t => t.status === col)}
                  onEdit={openEdit}
                  onDelete={setConfirm}
                  activeId={activeId}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <div className="bg-white rounded-xl border border-[#E8ECF0] p-3.5 shadow-xl opacity-90 rotate-1 w-[250px]">
                  <p className="text-sm font-semibold text-gray-900">{activeTask.title}</p>
                  <div className="mt-2"><Badge label={activeTask.priority} dot={false} /></div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* List view */}
        {view === 'list' && (
          <>
          {selected.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-sm font-semibold text-red-700">{selected.size} selected</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded-lg hover:bg-gray-100">Clear</button>
                <button onClick={handleDeleteSelected} disabled={deletingSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg disabled:opacity-60">
                  <Trash2 size={13} /> Delete {selected.size}
                </button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8ECF0] bg-gray-50/50">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 accent-red-500" />
                    </th>
                    {['Title', 'Assigned To', 'Due Date', 'Priority', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F5]">
                  {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 skeleton rounded" /></td>)}</tr>
                  )) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                      <CheckSquare size={36} className="mx-auto text-gray-200 mb-2" />
                      <p className="font-medium">No tasks found</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50/50 ${selected.has(r.id) ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-red-500" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{r.title}</p>
                        {r.description && <p className="text-xs text-gray-400 truncate max-w-xs">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.assigned_to || '—'}</td>
                      <td className={`px-4 py-3 text-xs font-semibold ${isOverdue(r.due_date) ? 'text-red-500' : 'text-gray-600'}`}>
                        {formatDate(r.due_date)}
                      </td>
                      <td className="px-4 py-3"><Badge label={r.priority} /></td>
                      <td className="px-4 py-3"><Badge label={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={15} /></button>
                          <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-[#F0F2F5]">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <CheckSquare size={36} className="mx-auto text-gray-200 mb-2" />
                  <p className="font-medium">No tasks found</p>
                </div>
              ) : filtered.map(r => (
                <div key={r.id} className={`p-4 space-y-2 ${selected.has(r.id) ? 'bg-red-50/40' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5 flex-1">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-red-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{r.title}</p>
                        {r.assigned_to && <p className="text-xs text-gray-500">{r.assigned_to}</p>}
                      </div>
                    </div>
                    <Badge label={r.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <Badge label={r.priority} dot={false} />
                      {r.due_date && <span className={`text-xs font-medium ${isOverdue(r.due_date) ? 'text-red-500' : 'text-gray-400'}`}>{formatDate(r.due_date)}</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Pencil size={14} /></button>
                      <button onClick={() => setConfirm(r)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit Task' : 'New Task'}
        footer={<div className="flex gap-3"><Button variant="secondary" fullWidth onClick={() => setDrawerOpen(false)}>Cancel</Button><Button fullWidth onClick={handleSave} loading={saving} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-0">Save Task</Button></div>}
      >
        <div className="space-y-4">
          <Input label="Title" required value={form.title} onChange={e => set('title', e.target.value)} error={errors.title} placeholder="Task title" />
          <Input label="Description" type="textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details about the task..." />
          <Input label="Assigned To" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Team member name" />
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          <Input label="Priority" type="select" value={form.priority} onChange={e => set('priority', e.target.value)} options={PRIORITIES} />
          <Input label="Status" type="select" value={form.status} onChange={e => set('status', e.target.value)} options={COLUMNS} />
        </div>
      </Drawer>

      <ConfirmDialog open={!!confirm} onCancel={() => setConfirm(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Task" message={`Delete task "${confirm?.title}"?`} />
    </div>
  )
}

