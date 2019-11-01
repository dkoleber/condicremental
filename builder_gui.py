import os
import sys
import json
from PyQt5.QtWidgets import QWidget, QCompleter, QLineEdit, QGridLayout, QApplication, QPushButton, QPlainTextEdit
from graphviz import Digraph

GOAL_NAME = 'goal_name'
RESOURCE_DEPENDENCIES = 'resource_dependencies'
GOAL_DEPENDENCIES = 'goal_dependencies'
RESOURCE_COST = 'resource_cost'
RESOURCE_OUTPUT = 'resource_output'
GOAL_OUTPUT = 'goal_output'

OUTPUT_FILENAME = 'dependencies.json'


class Window(QWidget):
    def __init__(self):
        QWidget.__init__(self)
        layout = QGridLayout()
        self.setLayout(layout)

        self.existing_goal_names = []
        self.existing_goal_completer = QCompleter(self.existing_goal_names)
        self.nex_goal_names = []
        self.nex_goal_completer = QCompleter(self.nex_goal_names)
        self.resource_names = []
        self.resource_completer = QCompleter(self.resource_names)

        self.name_edit = QLineEdit()
        self.name_edit.setCompleter(self.nex_goal_completer)
        self.name_edit.setPlaceholderText(' Goal Name')
        self.add_goal = QPushButton('FINISH')
        self.add_goal.clicked.connect(self.on_add_goal)
        self.show_graph = QPushButton('VIEW GRAPH')
        self.show_graph.clicked.connect(self.on_show_graph)

        self.goal_dep_edit = QLineEdit()
        self.goal_dep_edit.setCompleter(self.existing_goal_completer)
        self.goal_dep_edit.setPlaceholderText(' Goal Dependency')
        self.resource_dep_edit = QLineEdit()
        self.resource_dep_edit.setCompleter(self.resource_completer)
        self.resource_dep_edit.setPlaceholderText(' Resource Dependency')
        self.resource_dep_quant_edit = QLineEdit()
        self.resource_dep_quant_edit.setPlaceholderText(' Resource Quantity')
        self.add_resource_dep = QPushButton('+ADD+')
        self.add_resource_dep.clicked.connect(self.on_add_resource_dep)
        self.add_goal_dep = QPushButton('+ADD+')
        self.add_goal_dep.clicked.connect(self.on_add_goal_dep)

        self.resource_cost_edit = QLineEdit()
        self.resource_cost_edit.setCompleter(self.resource_completer)
        self.resource_cost_edit.setPlaceholderText(' Resource Cost')
        self.resource_cost_quant_edit = QLineEdit()
        self.resource_cost_quant_edit.setPlaceholderText(' Resource Quantity')
        self.add_resource_cost = QPushButton('+ADD+')
        self.add_resource_cost.clicked.connect(self.on_add_resource_cost)

        self.goal_out_edit = QLineEdit()
        self.goal_out_edit.setPlaceholderText(' Goal Unlock Output')
        self.resource_out_edit = QLineEdit()
        self.resource_out_edit.setCompleter(self.resource_completer)
        self.resource_out_edit.setPlaceholderText(' Resource Output')
        self.resource_out_quant_edit = QLineEdit()
        self.resource_out_quant_edit.setPlaceholderText(' Resource Quantity')
        self.add_resource_out = QPushButton('+ADD+')
        self.add_resource_out.clicked.connect(self.on_add_resource_out)
        self.add_goal_out = QPushButton('+ADD+')
        self.add_goal_out.clicked.connect(self.on_add_goal_out)

        self.goal_desc = QPlainTextEdit()

        layout.addWidget(self.add_goal, 0, 0)
        layout.addWidget(self.name_edit, 0, 1)
        layout.addWidget(self.show_graph, 0, 2)

        layout.addWidget(self.add_goal_dep, 1, 0)
        layout.addWidget(self.goal_dep_edit, 1, 1)
        layout.addWidget(self.add_resource_dep, 2, 0)
        layout.addWidget(self.resource_dep_edit, 2, 1)
        layout.addWidget(self.resource_dep_quant_edit, 2, 2)

        layout.addWidget(self.add_resource_cost, 3, 0)
        layout.addWidget(self.resource_cost_edit, 3, 1)
        layout.addWidget(self.resource_cost_quant_edit, 3, 2)

        #layout.addWidget(self.add_goal_out, 4, 0)
        #layout.addWidget(self.goal_out_edit, 4, 1)
        layout.addWidget(self.add_resource_out, 5, 0)
        layout.addWidget(self.resource_out_edit, 5, 1)
        layout.addWidget(self.resource_out_quant_edit, 5, 2)

        layout.addWidget(self.goal_desc, 6, 0, 15, 3)

        self.working_goal = get_blank_working_goal()
        self.dependencies = []
        self.load_dependencies()
        self.update_text()

    def update_completer(self):
        self.existing_goal_names = [x[GOAL_NAME] for x in self.dependencies]
        dep_goal_names = []
        for goal in self.dependencies:
            goal_list = goal[GOAL_DEPENDENCIES]
            goal_list.extend(goal[GOAL_OUTPUT])
            for g in goal_list:
                if g not in dep_goal_names:
                    dep_goal_names.append(g)

        self.nex_goal_names = list(set(dep_goal_names) - set(self.existing_goal_names))

        self.resource_names = []
        for goal in self.dependencies:
            resources = list(goal[RESOURCE_DEPENDENCIES].keys())
            resources.extend(list(goal[RESOURCE_OUTPUT].keys()))
            resources.extend(list(goal[RESOURCE_COST].keys()))
            for resource in resources:
                if resource not in self.resource_names:
                    self.resource_names.append(resource)

        self.existing_goal_completer = QCompleter(self.existing_goal_names)
        self.nex_goal_completer = QCompleter(self.nex_goal_names)
        self.resource_completer = QCompleter(self.resource_names)

        self.name_edit.setCompleter(self.nex_goal_completer)
        self.goal_dep_edit.setCompleter(self.existing_goal_completer)
        self.resource_dep_edit.setCompleter(self.resource_completer)
        self.resource_cost_edit.setCompleter(self.resource_completer)
        self.resource_out_edit.setCompleter(self.resource_completer)

    def load_dependencies(self):
        self.dependencies = load_dependencies()
        self.update_completer()

    def on_add_goal_dep(self):
        if self.goal_dep_edit.text() != '':
            self.working_goal[GOAL_DEPENDENCIES].append(self.goal_dep_edit.text())
            self.goal_dep_edit.setText('')
            self.update_text()

    def on_add_resource_dep(self):
        if self.resource_dep_edit.text() != '' and self.resource_dep_quant_edit.text() != '':
            self.working_goal[RESOURCE_DEPENDENCIES][self.resource_dep_edit.text()] = \
                int(str(self.resource_dep_quant_edit.text()))
            self.resource_dep_edit.setText('')
            self.resource_dep_quant_edit.setText('')
            self.update_text()

    def on_add_goal_out(self):
        if self.goal_out_edit.text() != '':
            self.working_goal[GOAL_OUTPUT].append(self.goal_out_edit.text())
            self.goal_out_edit.setText('')
            self.update_text()

    def on_add_resource_out(self):
        if self.resource_out_edit.text() != '' and self.resource_out_quant_edit.text() != '':
            self.working_goal[RESOURCE_OUTPUT][self.resource_out_edit.text()] = \
                int(str(self.resource_out_quant_edit.text()))
            self.resource_out_edit.setText('')
            self.resource_out_quant_edit.setText('')
            self.update_text()

    def on_add_resource_cost(self):
        if self.resource_cost_edit.text() != '' and self.resource_cost_quant_edit.text() != '':
            self.working_goal[RESOURCE_COST][self.resource_cost_edit.text()] = \
                int(str(self.resource_cost_quant_edit.text()))
            self.resource_cost_edit.setText('')
            self.resource_cost_quant_edit.setText('')
            self.update_text()

    def update_text(self):
        self.goal_desc.setPlainText(json.dumps(self.working_goal, indent=4)) #, sort_keys=True

    def on_add_goal(self):
        goal_name = self.name_edit.text()
        if goal_name != '' and next((item for item in self.dependencies if item[GOAL_NAME] == goal_name), None) is None:
            self.on_add_goal_dep()
            self.on_add_goal_out()
            self.on_add_resource_cost()
            self.on_add_resource_dep()
            self.on_add_resource_out()
            self.working_goal[GOAL_NAME] = goal_name
            self.dependencies.append(self.working_goal)
            save_dependencies(self.dependencies)
            self.working_goal = get_blank_working_goal()
            self.name_edit.setText('')
            self.update_text()
            self.update_completer()

    def on_show_graph(self):
        graph = Digraph()
        goal_names = []
        for goal in self.dependencies:
            graph.node(goal[GOAL_NAME])
            goal_names.append(goal[GOAL_NAME])
        for goal in self.dependencies:
            for dep in goal[GOAL_DEPENDENCIES]:
                if dep not in goal_names:
                    goal_names.append(dep)
                    graph.node(dep)
                graph.edge(dep, goal[GOAL_NAME])
        graph.render('graph.gv', view=True, format='png')


def get_blank_working_goal():
    return {
        GOAL_NAME: '',
        GOAL_DEPENDENCIES: [],
        RESOURCE_DEPENDENCIES: {},
        RESOURCE_COST: {},
        GOAL_OUTPUT: [],
        RESOURCE_OUTPUT: {}
    }


def save_dependencies(dependencies):
    with open(OUTPUT_FILENAME, 'w+') as fl:
        fl.write(json.dumps(dependencies, indent=4)) #, sort_keys=True


def load_dependencies():
    if os.path.exists(OUTPUT_FILENAME):
        with open(OUTPUT_FILENAME, 'r') as fl:
            return json.load(fl)
    else:
        return []

app = QApplication(sys.argv)
screen = Window()
screen.show()
sys.exit(app.exec_())


