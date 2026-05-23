import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { randomUUID } from 'crypto'
import { createServer } from 'net'
import {
  loadProject,
  getProjectNodes,
  readNodeContent,
  writeNodeContent,
  createStoryNode,
  renameStoryNode,
  deleteStoryNode
} from './project'
import { getAllMemos, createMemo, updateMemo, deleteMemo } from './memo'

const PORT_START = 3820
const PORT_END = 3830

export class MobileServer {
  private server: FastifyInstance | null = null
  private port: number = 0
  private token: string = ''
  private isRunning: boolean = false

  constructor() {
    this.token = randomUUID()
  }

  async start(): Promise<{ port: number; token: string }> {
    if (this.isRunning) {
      return { port: this.port, token: this.token }
    }

    try {
      this.port = await this.findAvailablePort()
    } catch (error) {
      throw new Error('No available port found')
    }

    this.server = Fastify({
      logger: false
    })

    await this.server.register(cors, {
      origin: '*'
    })

    this.setupRoutes()

    await this.server.listen({ port: this.port, host: '0.0.0.0' })
    this.isRunning = true

    console.log(`Mobile Server running on port ${this.port}`)
    return { port: this.port, token: this.token }
  }

  private async findAvailablePort(): Promise<number> {
    for (let port = PORT_START; port <= PORT_END; port++) {
      if (await this.isPortAvailable(port)) {
        return port
      }
    }
    throw new Error(`No available port in range ${PORT_START}-${PORT_END}`)
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close()
        resolve(true)
      })
      server.listen(port)
    })
  }

  private setupRoutes() {
    if (!this.server) return

    this.server!.get('/api/discover', async () => {
      return {
        serverName: 'Story Studio World',
        version: '1.0.0',
        token: this.token
      }
    })

    this.server!.post('/api/connect', async (request, reply) => {
      const { token } = request.body as any

      if (token !== this.token) {
        return reply.code(401).send({ success: false, error: 'Invalid token' })
      }

      return { success: true }
    })

    this.server!.get('/api/projects', async () => {
      try {
        const recentProjects = await this.getRecentProjects()
        return { projects: recentProjects }
      } catch (error) {
        return { projects: [] }
      }
    })

    this.server!.get('/api/projects/:path', async (request, reply) => {
      const { path } = request.params as any
      try {
        const project = await loadProject(decodeURIComponent(path))
        return project
      } catch (error) {
        return reply.code(404).send({ error: 'Project not found' })
      }
    })

    this.server!.get('/api/projects/:path/nodes', async (request) => {
      const { path } = request.params as any
      try {
        const nodes = await getProjectNodes(decodeURIComponent(path))
        return { nodes }
      } catch (error) {
        return { nodes: [] }
      }
    })

    this.server!.get('/api/nodes/:id/content', async (request) => {
      const { id } = request.params as any
      const { projectPath } = request.query as any

      try {
        const content = await readNodeContent({
          projectSettingsPath: projectPath,
          nodeId: id
        })
        return { content }
      } catch (error) {
        return { content: '' }
      }
    })

    this.server!.post('/api/nodes/:id/content', async (request) => {
      const { id } = request.params as any
      const { content, projectPath } = request.body as any

      try {
        await writeNodeContent({
          projectSettingsPath: projectPath,
          nodeId: id,
          content
        })
        return { success: true }
      } catch (error) {
        return { success: false, error: 'Failed to save content' }
      }
    })

    this.server!.post('/api/projects/:path/nodes', async (request, reply) => {
      const { path } = request.params as any
      const { parentId, name, type, kind } = request.body as any

      try {
        const node = await createStoryNode({
          projectSettingsPath: decodeURIComponent(path),
          parentId,
          name,
          type,
          kind
        })
        return node
      } catch (error) {
        return reply.code(500).send({ error: 'Failed to create node' })
      }
    })

    this.server!.put('/api/projects/:path/nodes/:id', async (request) => {
      const { path, id } = request.params as any
      const { name } = request.body as any

      try {
        await renameStoryNode({
          projectSettingsPath: decodeURIComponent(path),
          nodeId: id,
          newName: name
        })
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    })

    this.server!.delete('/api/projects/:path/nodes/:id', async (request) => {
      const { path, id } = request.params as any

      try {
        await deleteStoryNode({
          projectSettingsPath: decodeURIComponent(path),
          nodeId: id
        })
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    })

    this.server!.get('/api/memos', async () => {
      try {
        const memos = await getAllMemos()
        return { memos }
      } catch (error) {
        return { memos: [] }
      }
    })

    this.server!.post('/api/memos', async (request, reply) => {
      const { content } = request.body as any
      try {
        const memo = await createMemo(content)
        return memo
      } catch (error) {
        return reply.code(500).send({ error: 'Failed to create memo' })
      }
    })

    this.server!.put('/api/memos/:id', async (request) => {
      const { id } = request.params as any
      const { content } = request.body as any
      try {
        await updateMemo(id, content)
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    })

    this.server!.delete('/api/memos/:id', async (request) => {
      const { id } = request.params as any
      try {
        await deleteMemo(id)
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    })
  }

  private async getRecentProjects(): Promise<any[]> {
    const { app } = require('electron')
    const { join } = require('path')
    const { readFileSync, existsSync } = require('fs')

    const dbPath = join(app.getPath('userData'), 'storystudioworld.db')

    if (!existsSync(dbPath)) {
      return []
    }

    try {
      const dbContent = readFileSync(dbPath, 'utf-8')
      const db = JSON.parse(dbContent)
      return db.recentProjects || []
    } catch {
      return []
    }
  }

  async stop() {
    if (this.server) {
      await this.server.close()
      this.server = null
      this.isRunning = false
    }
  }

  getServerInfo() {
    return {
      port: this.port,
      token: this.token,
      isRunning: this.isRunning
    }
  }
}
