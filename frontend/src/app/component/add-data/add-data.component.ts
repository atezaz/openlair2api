import {Component, OnInit} from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import {DataService} from '../../data.service';
import {ActivatedRoute, Router} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {LearningActivity} from "../../_models/learningActivity.model";
import {indicator} from "../../_models/indicator.model";
import {Reference} from "../../_models/reference.model";
import {HeaderService} from "../header/header.service";
import {Observable} from "rxjs";
import {shareReplay} from "rxjs/operators";
import {PathObject} from "../../_models/pathObject.model";
import { MatDialog } from '@angular/material';

import { AddDataDialogComponent } from './add-data-dialog.component';
import { FileData } from 'src/app/data.model';

@Component({
    selector: 'app-add-data',
    templateUrl: './add-data.component.html',
    styleUrls: ['./add-data.component.css']
})


export class AddDataComponent implements OnInit {

    public fileName: string = ""
    public fileData: FileData
    public indicatorColumns: string[] = ['Count', 'Name', 'Action'];
    public metricColumns: string[] = ['Count', 'Name', 'Action'];
    public activityColumns: string[] = ['Count', 'Name', 'Indicators'];
    public eventColumns: string[] = ['Count', 'Name', 'Activities'];

    data: PathObject;
    private target: string;

    //NEW Stuff

    similarActivityMessage: any;
    CUserName: any;
    indicatorForm: FormGroup;
    referenceForm: FormGroup;

    learningActivitiesOptions: LearningActivity[];
    indicatorOptions$: Observable<indicator[]>;
    referenceOptions: Reference[];

    indicatorId: string;
    useExistingReference: boolean = false;
    private previousReferenceName: string;
    private previousReferenceLink: string;
    private newReferenceNumber: string;
    private existingReferenceNumber: string;

    verifiedOptions: string[] = ['verified', 'not verified', 'not mentioned'];
    developmentOptions: string[] = ['developed', 'proposed', 'not mentioned'];

    constructor(private dataService: DataService, private router: Router, private route: ActivatedRoute, private fb: FormBuilder,
                headerService: HeaderService, private http: HttpClient, private dialog: MatDialog) {
        headerService.setHeader('add-indicator')

        if (localStorage.getItem('currentUser')) {
            this.CUserName = JSON.parse(localStorage.getItem('currentUser')).username;
        }

        this.target = this.route.snapshot.data.target;
        this.data = this.route.snapshot.data.data;
        if (this.data.reference) {
            this.existingReferenceNumber = this.data.reference.referenceNumber;
        }
        if (this.data.indicator) {
            this.indicatorId = this.data.indicator._id;
            this.existingReferenceNumber = this.data.indicator.referenceNumber;
        }

        //// form entries///////
        this.indicatorForm = this.fb.group({
            learningActivity: [{value: null, disabled: this.target}, Validators.required],
            indicatorName: [{value: null, disabled: this.readonly('reference')}, Validators.required],
            metrics: [{value: null, disabled: this.readonly('reference')}, Validators.required],
            referenceNumber: [{value: null, disabled: true}, Validators.required]
        });

        this.referenceForm = this.fb.group({
            referenceText: [{value: null, disabled: this.readonly('indicator')}, Validators.required],
            referenceLink: [{value: null, disabled: this.readonly('indicator')}, Validators.required],
            referenceNumber: [{value: null, disabled: true}, Validators.required],
            verified: [{value: null, disabled: this.readonly('indicator')}],
            development: [{value: null, disabled: this.readonly('indicator')}],
        });

        this.referenceForm.controls['referenceNumber'].valueChanges.subscribe(value => this.indicatorForm.controls['referenceNumber'].setValue(value));
    }

    ngOnInit() {
        this.fetchData();
        setTimeout(() => {
            this.initializeData()
        }, 200)
    }

    fetchData() {
        this.dataService.getActivities().subscribe(activities => {
            this.learningActivitiesOptions = activities;
        });
        this.indicatorOptions$ = this.dataService.getIndicators().pipe(shareReplay());
        this.dataService.getReferences().subscribe(references => {
            this.referenceOptions = references;
            const referenceIds = references.map(reference => reference.referenceNumber);
            for (let i = 1; i <= referenceIds.length + 1; i++) {
                if (!referenceIds.includes(`[${i}]`)) {
                    this.newReferenceNumber = `[${i}]`
                    if (!this.existingReferenceNumber) {
                        this.referenceForm.patchValue({'referenceNumber': this.newReferenceNumber});
                    }
                    break;
                }
            }
        })
    }

    private initializeData() {
        if (this.target) {
            if (this.data.indicator) {
                this.indicatorForm.patchValue({
                    indicatorName: this.data.indicator.Title,
                    metrics: this.data.indicator.metrics,
                })
                this.referenceForm.patchValue({
                    referenceNumber: this.data.indicator.referenceNumber,
                })
                this.indicatorForm.get('learningActivity').setValue(this.data.activity);
            } else {
                this.indicatorForm.patchValue({
                    indicatorName: 'No indicator found',
                    metrics: 'No indicator found',
                })
            }
            if (this.data.reference) {
                this.referenceForm.patchValue({
                    referenceText: this.data.reference.referenceText,
                    referenceLink: this.data.reference.link,
                    referenceNumber: this.data.reference.referenceNumber,
                    verified: this.data.reference.status,
                    development: this.data.reference.development
                })
            } else {
                this.referenceForm.patchValue({
                    referenceText: 'Reference has been deleted',
                    referenceLink: 'Reference has been deleted'
                })
            }
        }
    }

    addData() {
        const indicatorFormValue = this.indicatorForm.getRawValue();
        const referenceFormValue = this.referenceForm.getRawValue();

        const indicator: indicator = {
            referenceNumber: indicatorFormValue.referenceNumber,
            Title: indicatorFormValue.indicatorName,
            metrics: indicatorFormValue.metrics
        }
        let referenceLink = referenceFormValue.referenceLink;
        if (referenceLink === '') {
            referenceLink = null;
        }
        const reference: Reference = {
            referenceNumber: referenceFormValue.referenceNumber,
            referenceText: referenceFormValue.referenceText,
            link: referenceLink,
            status: referenceFormValue.verified,
            development: referenceFormValue.development
        }

        this.indicatorForm.markAllAsTouched();
        this.referenceForm.markAllAsTouched();

        switch (this.target) {
            case 'indicator':
                if (!this.indicatorForm.valid) {
                    return
                }
                this.dataService.editIndicator(this.indicatorId, indicator).subscribe(() => {
                    this.router.navigate(['/']);
                })
                break;
            case 'reference':
                if (!this.referenceForm.valid) {
                    return
                }

                this.dataService.updateReference(this.data.reference._id, reference).subscribe(() => {
                    this.router.navigate(['/reference']);
                })
                break;
            default:
                if (!this.referenceForm.valid || !this.indicatorForm.valid) {
                    return
                }

                const dataObject: { activity: LearningActivity, indicator: indicator, reference: Reference } = {
                    activity: indicatorFormValue.learningActivity,
                    indicator,
                    reference: this.useExistingReference ? null : reference
                }
                this.dataService.addIndicatorAndReference(dataObject).subscribe(() => {
                    this.router.navigate(['/']);
                })
        }
    }

    learningActivitySelected(learningActivity: LearningActivity) {
        if (learningActivity) {
            this.dataService.getEventsByActivityId(learningActivity._id).subscribe(events => {
                const eventNames = events.map(event => event.name);
                if (eventNames.length === 1) {
                    this.similarActivityMessage = `The selected learning activity "${learningActivity.name}"
                    lies under the learning event "${eventNames[0]}".`
                }
                if (eventNames.length > 1) {
                    const namesWithComma = eventNames.join(', ')
                    this.similarActivityMessage = `The selected learning activity "${learningActivity.name}" lies under
                     the learning events "${namesWithComma}". Therefore, the Indicator and Metrics you want to add will
                      be added automatically under all of the mentioned learning events.`
                }
            })
        } else {
            this.similarActivityMessage = null;
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.router.navigate(['/']);
    }

    checkboxReferenceClicked() {
        this.useExistingReference = !this.useExistingReference;
        if (!this.useExistingReference) {
            this.referenceForm.get('referenceLink').enable();
            this.referenceForm.get('verified').enable();
            this.referenceForm.get('development').enable();
            this.referenceForm.patchValue({
                referenceText: this.previousReferenceName,
                referenceLink: this.previousReferenceLink,
                referenceNumber: this.newReferenceNumber,
                verified: null,
                development: null
            });
        } else {
            this.setPreviousValues()
            this.referenceForm.get('referenceLink').disable();
            this.referenceForm.get('verified').disable();
            this.referenceForm.get('development').disable();
            this.referenceForm.patchValue({
                referenceText: null,
                referenceLink: null,
                referenceNumber: null,
                verified: null,
                development: null
            });
        }
    }

    compareMethod(item, selected) {
        return item._id === selected._id;
    }

    onReferenceChange(reference: Reference) {
        if (reference) {
            this.referenceForm.patchValue(
                {
                    referenceText: reference.referenceText,
                    referenceLink: reference.link,
                    referenceNumber: reference.referenceNumber,
                    verified: reference.status,
                    development: reference.development
                });
        } else {
            this.referenceForm.patchValue(
                {
                    referenceText: null,
                    referenceLink: null,
                    referenceNumber: null,
                    verified: null,
                    development: null
                });
        }
    }

    private setPreviousValues() {
        this.previousReferenceName = this.referenceForm.value['referenceText'];
        this.previousReferenceLink = this.referenceForm.value['referenceLink'];
    }

    readonly(target: string) {
        if (!target) return false;
        return this.target === target;
    }

    resetFileData (): void {
        this.fileData = {
            indicators: null,
            indicator_sentences: null,
            metrics: null,
            metric_sentences: null,
            activities: null,
            events: null,
        }
    }

    openIndicatorDialog(event: MouseEvent): void {
        const target: HTMLElement = event.target as HTMLElement
        const delimiter = target.id.indexOf(':')
        const group: string = target.id.slice(0, delimiter)
        const name: string = target.id.slice(delimiter + 1)
        this.dialog.open(AddDataDialogComponent, {
            data: { name: name, data: this.fileData[group][name] }
        })
    }

    removeListElement(event: MouseEvent): void {
        const target: HTMLElement = event.target as HTMLElement
        // const delimiter = target.id.indexOf(':')
        // const name: string = target.id.slice(delimiter + 1)
        // <mat-chip>.<td>.<tr> delete
        if(confirm("Do you want to delete this item?")) target.parentElement.parentElement.remove()
    }

    onFileSelected(event: MouseEvent) {
        const target: EventTarget = event.target
        if(target instanceof HTMLInputElement) {
            let file: File = target.files[0]
            if (file) {
                this.fileName = file.name
                this.fileData = null
                const formData = new FormData();
                formData.append("file", file);

                const headers = new HttpHeaders()
                headers.append('Content-Type', 'multipart/form-data');
                headers.append('Accept', 'application/json');

                let options = { headers: headers };
                this.http.post("http://localhost:49160/", formData, options = options)
                .subscribe((res) => {
                    this.resetFileData()
                    console.log("Got something back")
                    const rawData = (Object.values(res)[0])[0]
                    this.fileData.indicators = Object.entries(rawData.indicators)
                    .map(val => { return { name: val[0], count: val[1] as number} })
                    .sort((a, b) => b.count - a.count)
                    this.fileData.metrics = Object.entries(rawData.metrics)
                    .map(val => { return { name: val[0], count: val[1] as number} })
                    .sort((a, b) => b.count - a.count)
                    this.fileData.activities = Object.entries(rawData.activities)
                    .map(val => { return { name: val[0], count: val[1][1] as number, list: val[1][0]} })
                    .sort((a, b) => b.count - a.count)
                    this.fileData.events = Object.entries(rawData.events)
                    .map(val => { return { name: val[0], count: val[1][1] as number, list: val[1][0]} })
                    .sort((a, b) => b.count - a.count)
                    this.fileData.indicator_sentences = rawData.indicator_sentences
                    this.fileData.metric_sentences = rawData.metric_sentences
                })
            }

        }
    }

    setIndicator(event: MouseEvent) {
        const target: HTMLElement = event.target as HTMLElement
        const delimiter = target.id.indexOf(':')
        const name: string = target.id.slice(delimiter + 1)
        this.indicatorForm.controls.indicatorName.setValue(name)
    }

    addMetric(event: MouseEvent) {
        const target: HTMLElement = event.target as HTMLElement
        const delimiter = target.id.indexOf(':')
        const name: string = target.id.slice(delimiter + 1)
        const control = this.indicatorForm.controls.metrics
        let current = this.indicatorForm.controls.metrics.value
        if (!current) {
            control.setValue(name)
        }
        else {
            current = current.trim()
            if (current[-1] === ',')  control.setValue(current + name)
            else control.setValue(current + ',' + name)
        }
    }
}
