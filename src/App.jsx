import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, isValid } from 'date-fns'
import { ru } from 'date-fns/locale'
import './App.css'

const STATUSES = {
    'not-started': { label: 'Не начат', color: 'var(--status-not-started)', icon: '⭕' },
    'in-progress': { label: 'В работе', color: 'var(--status-in-progress)', icon: '🔄' },
    'completed': { label: 'Выполнено', color: 'var(--status-completed)', icon: '✅' }
}

function App() {
    const [roadmap, setRoadmap] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Загрузка примера дорожной карты при монтировании
    useEffect(() => {
        loadExampleRoadmap()
    }, [])

    const loadExampleRoadmap = async () => {
        try {
            setLoading(true)
            const response = await fetch('/react-roadmap.json')
            if (!response.ok) throw new Error('Не удалось загрузить дорожную карту')
            const data = await response.json()
            setRoadmap(data)
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = (event) => {
        const file = event.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = e.target.result
                const parsed = JSON.parse(content)

                // Валидация структуры
                if (!parsed.title || !Array.isArray(parsed.items)) {
                    throw new Error('Неверный формат файла. Ожидается JSON с полями title и items')
                }

                // Инициализация статусов если их нет
                const itemsWithStatus = parsed.items.map(item => ({
                    ...item,
                    status: item.status || 'not-started',
                    userNotes: item.userNotes || '',
                    dueDate: item.dueDate || null
                }))

                setRoadmap({ ...parsed, items: itemsWithStatus })
                setError('')
                alert('Дорожная карта успешно загружена!')
            } catch (err) {
                setError(`Ошибка загрузки: ${err.message}`)
                console.error('Ошибка парсинга JSON:', err)
            }
        }

        reader.onerror = () => {
            setError('Ошибка чтения файла')
        }

        reader.readAsText(file, 'UTF-8')
    }

    const exportRoadmap = () => {
        if (!roadmap) {
            alert('Нет данных для экспорта')
            return
        }

        const dataStr = JSON.stringify(roadmap, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' })

        const link = document.createElement('a')
        link.href = URL.createObjectURL(dataBlob)
        link.download = `${roadmap.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
        link.click()
    }

    const updateItem = (itemId, updates) => {
        if (!roadmap) return

        setRoadmap(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            )
        }))
    }

    const calculateProgress = () => {
        if (!roadmap || !roadmap.items.length) return 0

        const completedItems = roadmap.items.filter(item => item.status === 'completed').length
        return Math.round((completedItems / roadmap.items.length) * 100)
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка дорожной карты...</p>
            </div>
        )
    }

    return (
        <div className="app">
            <Routes>
                <Route path="/" element={
                    <HomePage
                        roadmap={roadmap}
                        error={error}
                        onFileUpload={handleFileUpload}
                        onExport={exportRoadmap}
                        progress={calculateProgress()}
                    />
                } />
                <Route path="/item/:itemId" element={
                    <ItemDetailPage
                        roadmap={roadmap}
                        onUpdateItem={updateItem}
                    />
                } />
            </Routes>
        </div>
    )
}

function HomePage({ roadmap, error, onFileUpload, onExport, progress }) {
    const navigate = useNavigate()

    return (
        <>
            <header className="header">
                <div className="container">
                    <div className="header-content">
                        <Link to="/" className="logo">
                            <i className="fas fa-map"></i>
                            <span>Трекер технологий</span>
                        </Link>

                        <div className="header-actions">
                            <label className="upload-btn">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={onFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <i className="fas fa-upload"></i> Загрузить карту
                            </label>

                            {roadmap && (
                                <button onClick={onExport} className="export-btn">
                                    <i className="fas fa-download"></i> Экспорт
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="main-content">
                <div className="container">
                    {error && (
                        <div className="error-alert">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {roadmap ? (
                        <>
                            <div className="roadmap-header">
                                <h1>{roadmap.title}</h1>
                                <p className="roadmap-description">{roadmap.description}</p>

                                <div className="progress-section">
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="progress-stats">
                                        <span className="progress-percent">{progress}%</span>
                                        <span className="progress-text">
                                            {roadmap.items.filter(item => item.status === 'completed').length} из {roadmap.items.length} тем
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="status-legend">
                                {Object.entries(STATUSES).map(([key, status]) => (
                                    <div key={key} className="legend-item">
                                        <span className="status-badge" style={{ backgroundColor: status.color }}>
                                            {status.icon}
                                        </span>
                                        <span>{status.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="roadmap-grid">
                                {roadmap.items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`roadmap-card status-${item.status}`}
                                        onClick={() => navigate(`/item/${item.id}`)}
                                    >
                                        <div className="card-header">
                                            <span className="status-indicator" style={{ backgroundColor: STATUSES[item.status].color }}>
                                                {STATUSES[item.status].icon}
                                            </span>
                                            <h3>{item.title}</h3>
                                        </div>

                                        <p className="card-description">{item.description}</p>

                                        {item.dueDate && (
                                            <div className="due-date">
                                                <i className="far fa-calendar"></i>
                                                <span>До: {format(parseISO(item.dueDate), 'dd.MM.yyyy', { locale: ru })}</span>
                                            </div>
                                        )}

                                        {item.userNotes && (
                                            <div className="has-notes">
                                                <i className="far fa-sticky-note"></i>
                                                <span>Есть заметки</span>
                                            </div>
                                        )}

                                        <div className="card-footer">
                                            <span className="view-details">
                                                Подробнее <i className="fas fa-arrow-right"></i>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <i className="fas fa-road"></i>
                            <h2>Добро пожаловать в Трекер технологий!</h2>
                            <p>Загрузите дорожную карту в формате JSON или начните с примера</p>

                            <div className="empty-state-actions">
                                <label className="primary-btn">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={onFileUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <i className="fas fa-upload"></i> Загрузить карту
                                </label>

                                <p className="mt-2 text-center">Или используйте пример дорожной карты React</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p>© 2025.</p>
                </div>
            </footer>
        </>
    )
}

function ItemDetailPage({ roadmap, onUpdateItem }) {
    const { itemId } = useParams()
    const navigate = useNavigate()

    if (!roadmap) {
        return (
            <div className="container">
                <div className="error-state">
                    <h2>Дорожная карта не загружена</h2>
                    <button onClick={() => navigate('/')} className="primary-btn">
                        Вернуться на главную
                    </button>
                </div>
            </div>
        )
    }

    const item = roadmap.items.find(item => item.id === itemId)

    if (!item) {
        return (
            <div className="container">
                <div className="error-state">
                    <h2>Тема не найдена</h2>
                    <button onClick={() => navigate('/')} className="primary-btn">
                        Вернуться на главную
                    </button>
                </div>
            </div>
        )
    }

    const [notes, setNotes] = useState(item.userNotes || '')
    const [status, setStatus] = useState(item.status || 'not-started')
    const [dueDate, setDueDate] = useState(item.dueDate || '')
    const [isEditing, setIsEditing] = useState(false)

    const handleSave = () => {
        const updates = {
            userNotes: notes,
            status: status,
            dueDate: dueDate || null
        }

        onUpdateItem(itemId, updates)
        setIsEditing(false)
    }

    const formatDateForInput = (dateString) => {
        if (!dateString) return ''
        try {
            const date = parseISO(dateString)
            return isValid(date) ? format(date, 'yyyy-MM-dd') : ''
        } catch {
            return ''
        }
    }

    return (
        <div className="detail-container">
            <header className="detail-header">
                <div className="container">
                    <div className="d-flex align-center justify-between">
                        <button onClick={() => navigate('/')} className="back-btn">
                            <i className="fas fa-arrow-left"></i> Назад к карте
                        </button>

                        <div className="progress-indicator">
                            Прогресс: {Math.round((roadmap.items.filter(i => i.status === 'completed').length / roadmap.items.length) * 100)}%
                        </div>
                    </div>
                </div>
            </header>

            <main className="detail-main">
                <div className="container">
                    <div className="detail-content">
                        <div className="detail-card">
                            <div className="detail-header-section">
                                <div className="status-badge-large" style={{ backgroundColor: STATUSES[status].color }}>
                                    {STATUSES[status].icon}
                                    <span>{STATUSES[status].label}</span>
                                </div>

                                <h1>{item.title}</h1>
                                <p className="item-description">{item.description}</p>
                            </div>

                            {item.links && item.links.length > 0 && (
                                <div className="links-section">
                                    <h3><i className="fas fa-link"></i> Полезные ссылки</h3>
                                    <div className="links-grid">
                                        {item.links.map((link, index) => (
                                            <a
                                                key={index}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-card"
                                            >
                                                <i className="fas fa-external-link-alt"></i>
                                                <span>{link.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="edit-section">
                                <div className="section-header">
                                    <h3><i className="far fa-edit"></i> Персонализация</h3>
                                    {!isEditing ? (
                                        <button onClick={() => setIsEditing(true)} className="edit-btn">
                                            <i className="fas fa-pencil-alt"></i> Редактировать
                                        </button>
                                    ) : (
                                        <div className="edit-actions">
                                            <button onClick={handleSave} className="save-btn">
                                                <i className="fas fa-save"></i> Сохранить
                                            </button>
                                            <button onClick={() => setIsEditing(false)} className="cancel-btn">
                                                Отмена
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="edit-form">
                                        <div className="form-group">
                                            <label>Статус:</label>
                                            <div className="status-selector">
                                                {Object.entries(STATUSES).map(([key, statusInfo]) => (
                                                    <button
                                                        key={key}
                                                        className={`status-option ${status === key ? 'active' : ''}`}
                                                        style={{ borderColor: statusInfo.color }}
                                                        onClick={() => setStatus(key)}
                                                    >
                                                        {statusInfo.icon} {statusInfo.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Дата завершения:</label>
                                            <input
                                                type="date"
                                                value={formatDateForInput(dueDate)}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="date-input"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Мои заметки:</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Добавьте свои заметки, конспекты, полезные команды..."
                                                className="notes-textarea"
                                                rows={6}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="view-section">
                                        <div className="info-row">
                                            <span className="info-label">Статус:</span>
                                            <span className="info-value">
                                                <span className="status-dot" style={{ backgroundColor: STATUSES[status].color }}></span>
                                                {STATUSES[status].label}
                                            </span>
                                        </div>

                                        {dueDate && (
                                            <div className="info-row">
                                                <span className="info-label">Дата завершения:</span>
                                                <span className="info-value">
                                                    <i className="far fa-calendar"></i>
                                                    {format(parseISO(dueDate), 'dd MMMM yyyy', { locale: ru })}
                                                </span>
                                            </div>
                                        )}

                                        {notes ? (
                                            <div className="notes-view">
                                                <h4><i className="far fa-sticky-note"></i> Мои заметки:</h4>
                                                <div className="notes-content">{notes}</div>
                                            </div>
                                        ) : (
                                            <div className="empty-notes">
                                                <i className="far fa-sticky-note"></i>
                                                <p>Заметок пока нет. Нажмите "Редактировать" чтобы добавить свои заметки.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default App