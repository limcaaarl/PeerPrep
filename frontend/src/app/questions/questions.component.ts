import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { FormsModule, Validators } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CommonModule, NgFor } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Question, SingleQuestionResponse, QuestionBody } from './question.model';
import { Column } from './column.model';
import { Topic } from './topic.model';
import { Difficulty } from './difficulty.model';
import { DifficultyLevels } from './difficulty-levels.enum';
import { QuestionService } from './question.service';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-questions',
    standalone: true,
    imports: [
        TableModule,
        NgFor,
        CommonModule,
        FormsModule,
        ToastModule,
        ToolbarModule,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        ButtonModule,
        ReactiveFormsModule,
        MultiSelectModule,
        DropdownModule,
        ProgressSpinnerModule,
    ],
    providers: [QuestionService, ConfirmationService, MessageService],
    templateUrl: './questions.component.html',
    styleUrl: './questions.component.css',
})
export class QuestionsComponent implements OnInit {
    loading = true;

    questions: Question[] = [];

    topics!: Topic[];

    difficulties!: Difficulty[];

    questionFormGroup!: FormGroup;

    difficulty!: string;

    question!: Question;

    selectedQuestions!: Question[] | null;

    submitted = false;

    isDialogVisible = false;

    cols: Column[] = [];

    dialogHeader = '';

    constructor(
        private questionService: QuestionService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
    ) {}

    ngOnInit() {
        // two way binding for forms is not working for some reason unless question is initialised with empty values
        this.initQuestion();

        // fetch data from API call
        this.handleInitData();

        this.initDifficulties();

        this.initFormGroup();
    }

    get isTitleInvalid(): boolean {
        const titleControl = this.questionFormGroup.controls['title'];
        return titleControl.dirty && titleControl.invalid;
    }

    get isDescriptionInvalid(): boolean {
        const descriptionControl = this.questionFormGroup.controls['description'];
        return descriptionControl.dirty && descriptionControl.invalid;
    }

    get isDifficultyInvalid(): boolean {
        const difficultyControl = this.questionFormGroup.controls['difficulty'];
        return difficultyControl.dirty && difficultyControl.invalid;
    }

    get isTopicsInvalid(): boolean {
        const topicsControl = this.questionFormGroup.controls['topics'];
        return topicsControl.dirty && topicsControl.invalid;
    }

    openNewQuestion() {
        this.dialogHeader = 'Create new question';
        this.resetFormGroup();
        this.question = {} as Question;
        this.submitted = false;
        this.isDialogVisible = true;
    }

    deleteSelectedQuestions() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected questions?',
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.handleDeleteQuestionResponse();
            },
        });
    }

    saveQuestion() {
        this.submitted = true;

        if (!this.questionFormGroup.valid) {
            return;
        }

        if (this.question.id) {
            // update
            this.handleEditQuestionResponse(this.question.id, this.questionFormGroup.value);
        } else {
            // add
            this.handleAddQuestionResponse();
        }

        this.isDialogVisible = false;
        this.question = {} as Question;
    }

    resetFormGroup() {
        this.questionFormGroup.reset({
            topics: [],
            difficulty: '',
            title: '',
            description: '',
        });
    }

    editQuestion(question: Question) {
        this.dialogHeader = 'Edit Question';
        this.question.id = question.id;
        this.questionFormGroup.patchValue({
            title: question.title,
            description: question.description,
            topics: question.topics,
            difficulty: question.difficulty,
        });
        this.isDialogVisible = true;
    }

    initFormGroup() {
        this.questionFormGroup = new FormGroup({
            topics: new FormControl<string[] | null>([], [Validators.required]),
            difficulty: new FormControl<Difficulty[] | null>([], [Validators.required]),
            title: new FormControl<string | null>('', [Validators.required]),
            description: new FormControl<string | null>('', [Validators.required]),
        });
    }

    initDifficulties() {
        this.difficulties = [
            { label: DifficultyLevels.EASY, value: DifficultyLevels.EASY },
            { label: DifficultyLevels.MEDIUM, value: DifficultyLevels.MEDIUM },
            { label: DifficultyLevels.HARD, value: DifficultyLevels.HARD },
        ];
    }

    initQuestion() {
        this.question = {
            id: -1,
            title: '',
            topics: [],
            description: '',
            difficulty: '',
        };
    }

    handleAddQuestionResponse() {
        this.questionService.addQuestion(this.questionFormGroup.value).subscribe({
            next: (response: SingleQuestionResponse) => {
                if (this.questions) {
                    this.questions = [...this.questions, response.data];
                }
            },
            error: (error: HttpErrorResponse) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to add new question. ' + error.error.message,
                    life: 3000,
                });
            },
            complete: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'New Question Added',
                    life: 3000,
                });
            },
        });
    }

    handleDeleteQuestionResponse() {
        const deleteRequests = this.selectedQuestions?.map(q => this.questionService.deleteQuestion(q.id));

        forkJoin(deleteRequests!).subscribe({
            next: () => {
                // delete locally
                this.questions = this.questions?.filter(val => !this.selectedQuestions?.includes(val));
                this.selectedQuestions = null;
            },
            error: (error: HttpErrorResponse) => {
                // Handle any errors from the forkJoin if necessary
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Some questions could not be deleted. ' + error.error.message,
                    life: 3000,
                });
            },
            complete: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Question(s) Deleted',
                    life: 3000,
                });
            },
        });
    }

    handleEditQuestionResponse(id: number, question: QuestionBody) {
        this.questionService.updateQuestion(id, question).subscribe({
            next: (response: SingleQuestionResponse) => {
                this.questions[this.questions.findIndex(x => x.id == id)] = response.data;
                this.questions = [...this.questions];
            },
            error: (error: HttpErrorResponse) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.error.message,
                    life: 3000,
                });
            },
            complete: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Question has been updated successfully',
                    life: 3000,
                });
            },
        });
    }

    handleInitData() {
        forkJoin({
            questions: this.questionService.getQuestions(),
            topics: this.questionService.getTopics(),
        }).subscribe({
            next: results => {
                this.questions = results.questions.data || [];
                this.topics =
                    results.topics.data?.map(topic => ({
                        label: topic,
                        value: topic,
                    })) || [];
            },
            error: () => {
                this.questions = [];
                this.topics = [];
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load data. Please try again later.',
                    life: 3000,
                });
            },
            complete: () => {
                this.loading = false;
            },
        });
    }
}
