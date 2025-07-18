'use strict'

const { parallel, series, watch } = require('gulp')
const createTask = require('./gulp.d/lib/create-task')
const exportTasks = require('./gulp.d/lib/export-tasks')
const log = require('fancy-log')

// Directories and file settings
const bundleName = 'ui'
const buildRootDir = 'build'
const bundleDir = `${buildRootDir}/bundle`
const previewDir = `${buildRootDir}/preview`
const srcDir = 'src'
const previewSrcDir = 'preview-src'
const stageDir = `${previewDir}/_`

// Livereload configuration
const { reload: livereload } = process.env.LIVERELOAD === 'true' ? require('gulp-connect') : {}
const serverConfig = { host: '0.0.0.0', port: 5252, livereload }

// Task utilities and glob patterns
const task = require('./gulp.d/tasks')
const glob = {
  all: [srcDir, previewSrcDir],
  css: `${srcDir}/css/**/*.css`,
  js: ['gulpfile.js', 'gulp.d/**/*.js', `${srcDir}/helpers/*.js`, `${srcDir}/js/**/+([^.])?(.bundle).js`],
}

// Clean task
const cleanTask = createTask({
  name: 'clean',
  desc: 'Clean files and folders generated by build',
  call: task.remove([buildRootDir]),
})

// Lint tasks
const lintCssTask = createTask({
  name: 'lint:css',
  desc: 'Lint the CSS source files using stylelint (standard config)',
  call: task.lintCss(glob.css),
})

const lintJsTask = createTask({
  name: 'lint:js',
  desc: 'Lint the JavaScript source files using eslint (JavaScript Standard Style)',
  call: task.lintJs(glob.js),
})

const lintTask = createTask({
  name: 'lint',
  desc: 'Lint the CSS and JavaScript source files',
  call: parallel(lintCssTask, lintJsTask),
})

// Code formatting task
const formatTask = createTask({
  name: 'format',
  desc: 'Format the JavaScript source files using Prettier',
  call: task.format(glob.js),
})

// Build tasks
const buildTask = createTask({
  name: 'build',
  desc: 'Build and stage the UI assets for bundling',
  call: task.build(
    srcDir,
    stageDir,
    process.argv.slice(2).some((name) => name.startsWith('preview'))
  ),
})

const bundleBuildTask = createTask({
  name: 'bundle:build',
  call: series(cleanTask, lintTask, buildTask),
})

const bundlePackTask = createTask({
  name: 'bundle:pack',
  desc: 'Create a bundle of the staged UI assets for publishing',
  call: task.pack(stageDir, bundleDir, bundleName, (bundlePath) => {
    if (!process.env.CI) log(`Antora option: --ui-bundle-url=${bundlePath}`)
  }),
})

// Combined bundle task
const bundleTask = createTask({
  name: 'bundle',
  desc: 'Clean, lint, build, and bundle the UI for publishing',
  call: series(bundleBuildTask, bundlePackTask),
})

// Build and preview tasks
const buildPreviewPagesTask = createTask({
  name: 'preview:build-pages',
  call: task.buildPreviewPages(srcDir, previewSrcDir, previewDir, livereload),
})

const previewBuildTask = createTask({
  name: 'preview:build',
  desc: 'Process, stage UI assets, and generate pages for the preview',
  call: parallel(buildTask, buildPreviewPagesTask),
})

const previewServeTask = createTask({
  name: 'preview:serve',
  call: task.serve(previewDir, serverConfig, () => watch(glob.all, previewBuildTask)),
})

const previewTask = createTask({
  name: 'preview',
  desc: 'Generate a preview site and launch a server to view it',
  call: series(previewBuildTask, previewServeTask),
})

module.exports = exportTasks(
  bundleTask,
  cleanTask,
  lintTask,
  formatTask,
  buildTask,
  bundleTask,
  bundlePackTask,
  previewTask,
  previewBuildTask
)
